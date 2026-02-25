import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import type { FastifyRequest } from 'fastify';
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

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_BATCH_SIZE = 10;
const DEFAULT_SIGNED_URL_EXPIRY = 3600; // 1 hour
const DEFAULT_PROVIDER = 'r2';

interface FilePayload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly defaultBucket: string;

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly storageFactory: StorageFactory,
    private readonly configService: ConfigService,
  ) {
    this.defaultBucket = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
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

    // Dedup: reuse storage key if identical file already exists
    const existing = await this.mediaRepository.findByChecksum(checksum);
    let storageKey: string;

    if (existing) {
      storageKey = existing.storageKey;
    } else {
      storageKey = this.generateStorageKey(file.filename, query.entityType);
      const provider = this.storageFactory.resolve(DEFAULT_PROVIDER);
      await provider.upload({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
      });
    }

    const record = await this.mediaRepository.create({
      originalName: file.filename,
      mimeType: file.mimetype,
      size: file.buffer.length,
      checksum,
      storageKey,
      bucket: this.defaultBucket,
      provider: DEFAULT_PROVIDER,
      status: 'ready',
      entityType: query.entityType,
      entityId: query.entityId,
      uploadedBy,
    });

    this.logger.log(`Uploaded media ${record.id}: ${file.filename} (${file.buffer.length} bytes)${existing ? ' [dedup]' : ''}`);
    return MediaDto.from(record);
  }

  // Uploads multiple files (max 10) and returns results
  async uploadBatch(files: FilePayload[], uploadedBy: string, query: UploadQueryDto): Promise<BatchUploadResponseDto> {
    if (files.length > MAX_BATCH_SIZE) {
      throw new BadRequestException({
        label: 'Too Many Files',
        detail: `Maximum ${MAX_BATCH_SIZE} files allowed per batch upload. You provided ${files.length}.`,
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
    const record = await this.mediaRepository.findActiveById(id);
    if (!record) {
      throw new NotFoundException('Media not found.');
    }
    return MediaDto.from(record);
  }

  // Generates a presigned download URL for a media item
  async getPresignedUrl(id: string): Promise<PresignedUrlResponseDto> {
    const media = await this.findById(id);
    const provider = this.storageFactory.resolve(media.provider);
    const url = await provider.getSignedUrl(media.storageKey, DEFAULT_SIGNED_URL_EXPIRY, media.bucket ?? undefined);

    return { url, expiresIn: DEFAULT_SIGNED_URL_EXPIRY };
  }

  // Returns a readable stream for downloading a media file
  async getStream(id: string): Promise<{ stream: Readable; media: MediaDto }> {
    const media = await this.findById(id);
    const provider = this.storageFactory.resolve(media.provider);
    const stream = await provider.getStream(media.storageKey, media.bucket ?? undefined);

    return { stream, media };
  }

  // Deletes a media record and removes the storage file if no other records reference it
  async delete(id: string, userId: string): Promise<void> {
    const record = await this.mediaRepository.findActiveById(id);
    if (!record) {
      throw new NotFoundException('Media not found.');
    }

    await this.mediaRepository.hardDelete(id);

    // Only delete from storage if this was the last reference
    const remaining = await this.mediaRepository.countByStorageKey(record.storageKey);
    if (remaining === 0) {
      const provider = this.storageFactory.resolve(record.provider);
      await provider.delete(record.storageKey, record.bucket ?? undefined);
      this.logger.log(`Deleted media ${id} and storage file by user ${userId}`);
    } else {
      this.logger.log(`Deleted media ${id} (${remaining} references remain) by user ${userId}`);
    }
  }

  // Queries media by entity type and entity ID
  async findByEntity(query: MediaQueryDto): Promise<MediaDto[]> {
    const records = await this.mediaRepository.findByEntity(query.entityType, query.entityId);
    return records.map((record) => MediaDto.from(record));
  }

  // Validates file size and MIME type
  private validateFile(file: FilePayload): void {
    if (file.buffer.length > DEFAULT_MAX_FILE_SIZE) {
      throw new BadRequestException({
        label: 'File Too Large',
        detail: `File size exceeds the maximum allowed size of ${DEFAULT_MAX_FILE_SIZE / (1024 * 1024)} MB.`,
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

  // Generates a storage key: {entityType}/{YYYY}/{MM}/{uuid}.{ext}
  private generateStorageKey(filename: string, entityType: string): string {
    const ext = extname(filename).toLowerCase();
    const uuid = randomUUID();
    return `${entityType}/${uuid}${ext}`;
  }
}
