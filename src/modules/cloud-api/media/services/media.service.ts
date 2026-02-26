import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import type { FastifyRequest } from 'fastify';
import { type Media, MediaStatusValues } from '@/db/schema';
import { MediaDto } from '../dto/entity/media.dto';
import type { MediaQueryDto } from '../dto/request/media-query.dto';
import type { UploadQueryDto } from '../dto/request/upload-query.dto';
import type { BatchUploadResponseDto } from '../dto/response/batch-upload-response.dto';
import type { PresignedUrlResponseDto } from '../dto/response/presigned-url-response.dto';
import { MediaRepository } from '../repositories/media.repository';
import { StorageFactory } from '../storage/storage.factory';

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

interface FilePayload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly defaultBucket: string;
  private readonly maxFileSize: number;
  private readonly maxBatchSize: number;
  private readonly signedUrlExpiry: number;
  private readonly defaultProvider: string;

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly storageFactory: StorageFactory,
    private readonly configService: ConfigService,
  ) {
    this.defaultBucket = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
    this.maxFileSize = this.configService.getOrThrow<number>('MEDIA_MAX_FILE_SIZE_MB') * 1024 * 1024;
    this.maxBatchSize = this.configService.getOrThrow<number>('MEDIA_MAX_BATCH_SIZE');
    this.signedUrlExpiry = this.configService.getOrThrow<number>('MEDIA_SIGNED_URL_EXPIRY');
    this.defaultProvider = this.configService.getOrThrow<string>('MEDIA_STORAGE_PROVIDER');
  }

  // Extracts and uploads a single file from a Fastify multipart request
  async uploadFromRequest(request: FastifyRequest, uploadedBy: string, query: UploadQueryDto): Promise<MediaDto> {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const buffer = await file.toBuffer();
    return this.upload({ buffer, filename: file.filename, mimetype: file.mimetype }, uploadedBy, query);
  }

  // Extracts and uploads multiple files from a Fastify multipart request
  async uploadBatchFromRequest(
    request: FastifyRequest,
    uploadedBy: string,
    query: UploadQueryDto,
  ): Promise<BatchUploadResponseDto> {
    const parts = request.files();
    const files: FilePayload[] = [];

    for await (const part of parts) {
      const buffer = await part.toBuffer();
      files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
    }

    if (files.length === 0) {
      throw new BadRequestException('No files provided.');
    }

    return this.uploadBatch(files, uploadedBy, query);
  }

  // Uploads a single file to storage and saves metadata to database
  async upload(file: FilePayload, uploadedBy: string, query: UploadQueryDto): Promise<MediaDto> {
    this.validateFile(file);
    const checksum = this.computeChecksum(file.buffer);

    // Replace: if entity already has media, return or replace
    const existingForEntity = await this.mediaRepository.findOneByEntity(query.entityType, query.entityId);

    if (existingForEntity) {
      // Same file -> return existing (no-op)
      if (existingForEntity.checksum === checksum) {
        this.logger.log(
          `Same file already exists for entity ${query.entityType}/${query.entityId}, returning existing`,
        );
        return MediaDto.from(existingForEntity);
      }

      // Different file -> delete old one first
      await this.deleteRecord(existingForEntity);
      this.logger.log(`Replaced media ${existingForEntity.id} for entity ${query.entityType}/${query.entityId}`);
    }

    // Dedup: reuse storage key if identical file exists elsewhere
    const existing = await this.mediaRepository.findByChecksum(checksum);
    let storageKey: string;

    if (existing) {
      storageKey = existing.storageKey;
    } else {
      storageKey = this.generateStorageKey(file.filename, query.entityType);
      const provider = this.storageFactory.resolve(this.defaultProvider);
      await provider.upload({ key: storageKey, body: file.buffer, contentType: file.mimetype });
    }

    // Persist record and clean up orphaned storage on failure
    try {
      const record = await this.mediaRepository.create({
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.buffer.length,
        checksum,
        storageKey,
        bucket: this.defaultBucket,
        provider: this.defaultProvider,
        status: MediaStatusValues.READY,
        entityType: query.entityType,
        entityId: query.entityId,
        uploadedBy,
      });

      this.logger.log(
        `Uploaded media ${record.id}: ${file.filename} (${file.buffer.length} bytes)${existing ? ' [dedup]' : ''}`,
      );
      return MediaDto.from(record);
    } catch (error) {
      if (!existing) {
        const provider = this.storageFactory.resolve(this.defaultProvider);
        await provider.delete(storageKey, this.defaultBucket).catch(() => {});
      }
      throw error;
    }
  }

  // Uploads multiple files (max 10) and returns results
  async uploadBatch(files: FilePayload[], uploadedBy: string, query: UploadQueryDto): Promise<BatchUploadResponseDto> {
    if (files.length > this.maxBatchSize) {
      throw new BadRequestException({
        label: 'Too Many Files',
        detail: `Maximum ${this.maxBatchSize} files allowed per batch upload. You provided ${files.length}.`,
      });
    }

    if (files.length > 1) {
      throw new BadRequestException({
        label: 'Batch Upload Not Supported',
        detail: 'Each entity can have only one media file. Upload one file at a time.',
      });
    }

    const uploaded: MediaDto[] = [];
    let failed = 0;

    for (const file of files) {
      try {
        const result = await this.upload(file, uploadedBy, query);
        uploaded.push(result);
      } catch (error) {
        failed++;
        this.logger.warn(
          `Failed to upload file ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { uploaded, failed };
  }

  // Retrieves media metadata by ID
  async findById(id: string): Promise<MediaDto> {
    const record = await this.findRecordById(id);
    return MediaDto.from(record);
  }

  // Generates a presigned download URL for a media item
  async getPresignedUrl(id: string): Promise<PresignedUrlResponseDto> {
    const record = await this.findRecordById(id);
    const provider = this.storageFactory.resolve(record.provider);
    const url = await provider.getSignedUrl(record.storageKey, this.signedUrlExpiry, record.bucket ?? undefined);
    return { url, expiresIn: this.signedUrlExpiry };
  }

  // Returns a readable stream for downloading a media file
  async getStream(id: string): Promise<{ stream: Readable; media: MediaDto }> {
    const record = await this.findRecordById(id);
    const provider = this.storageFactory.resolve(record.provider);
    const stream = await provider.getStream(record.storageKey, record.bucket ?? undefined);
    return { stream, media: MediaDto.from(record) };
  }

  // Deletes a media record and removes the storage file if no other records reference it
  async delete(id: string, userId: string): Promise<void> {
    const record = await this.findRecordById(id);
    await this.deleteRecord(record);
    this.logger.log(`Deleted media ${id} by user ${userId}`);
  }

  // Queries media by entity type and entity ID
  async findByEntity(query: MediaQueryDto): Promise<MediaDto[]> {
    const records = await this.mediaRepository.findByEntity(query.entityType, query.entityId);
    return records.map((record) => MediaDto.from(record));
  }

  // Finds a media record by ID or throws NotFoundException
  private async findRecordById(id: string): Promise<Media> {
    const record = await this.mediaRepository.findActiveById(id);
    if (!record) {
      throw new NotFoundException('Media not found.');
    }
    return record;
  }

  // Deletes a media record and removes storage file if no other records reference it
  private async deleteRecord(record: Media): Promise<void> {
    await this.mediaRepository.hardDelete(record.id);

    const remaining = await this.mediaRepository.countByStorageKey(record.storageKey);
    if (remaining === 0) {
      const provider = this.storageFactory.resolve(record.provider);
      await provider.delete(record.storageKey, record.bucket ?? undefined);
    }
  }

  // Validates file size and MIME type
  private validateFile(file: FilePayload): void {
    if (file.buffer.length > this.maxFileSize) {
      throw new BadRequestException({
        label: 'File Too Large',
        detail: `File size exceeds the maximum allowed size of ${this.maxFileSize / (1024 * 1024)} MB.`,
      });
    }

    if (!DEFAULT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        label: 'Unsupported File Type',
        detail: `The file type '${file.mimetype}' is not allowed.`,
      });
    }
  }

  // Computes SHA-256 checksum of file buffer
  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  // Sanitizes a string for use as a storage key path segment
  private sanitizePathSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  // Generates a storage key: {entityType}/{uuid}.{ext}
  private generateStorageKey(filename: string, entityType: string): string {
    const ext = extname(filename).toLowerCase();
    const uuid = randomUUID();
    const prefix = this.sanitizePathSegment(entityType);
    return `${prefix}/${uuid}${ext}`;
  }
}
