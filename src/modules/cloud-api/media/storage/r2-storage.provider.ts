import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@vritti/api-sdk';
import type { StorageProvider, UploadParams } from './storage-provider.interface';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly defaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.getOrThrow<string>('R2_ACCOUNT_ID');
    this.defaultBucket = this.configService.getOrThrow<string>('R2_BUCKET_NAME');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Uploads a file buffer or stream to R2
  async upload(params: UploadParams): Promise<string> {
    const bucket = params.bucket ?? this.defaultBucket;

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    this.logger.log(`Uploaded file to R2: ${params.key}`);
    return params.key;
  }

  // Deletes a file from R2
  async delete(key: string, bucket?: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket ?? this.defaultBucket,
        Key: key,
      }),
    );

    this.logger.log(`Deleted file from R2: ${key}`);
  }

  // Generates a presigned download URL (default 1 hour)
  async getSignedUrl(key: string, expiresInSeconds = 3600, bucket?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket ?? this.defaultBucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  // Returns a readable stream from R2
  async getStream(key: string, bucket?: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket ?? this.defaultBucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new NotFoundException('File not found in storage.');
    }

    return response.Body as Readable;
  }
}
