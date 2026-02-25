import type { Readable } from 'node:stream';

export interface UploadParams {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  bucket?: string;
}

export interface StorageProvider {
  upload(params: UploadParams): Promise<string>;
  delete(key: string, bucket?: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number, bucket?: string): Promise<string>;
  getStream(key: string, bucket?: string): Promise<Readable>;
}
