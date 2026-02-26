import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Media, MediaStatus } from '@/db/schema';

export class MediaDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'profile-photo.jpg' })
  originalName: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 245760 })
  size: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4e5f6...' })
  checksum: string | null;

  @ApiProperty({ example: 'user/2026/02/abc123.jpg' })
  storageKey: string;

  @ApiPropertyOptional({ example: 'my-bucket' })
  bucket: string | null;

  @ApiProperty({ example: 'r2' })
  provider: string;

  @ApiProperty({ enum: ['pending', 'ready', 'failed', 'deleted'], example: 'ready' })
  status: MediaStatus;

  @ApiPropertyOptional({ example: 'user' })
  entityType: string | null;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  entityId: string | null;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  uploadedBy: string | null;

  @ApiPropertyOptional({ example: { width: 800, height: 600 } })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;

  // Transforms a database entity into a response DTO
  static from(entity: Media): MediaDto {
    const dto = new MediaDto();
    dto.id = entity.id;
    dto.originalName = entity.originalName;
    dto.mimeType = entity.mimeType;
    dto.size = entity.size;
    dto.checksum = entity.checksum;
    dto.storageKey = entity.storageKey;
    dto.bucket = entity.bucket;
    dto.provider = entity.provider;
    dto.status = entity.status;
    dto.entityType = entity.entityType;
    dto.entityId = entity.entityId;
    dto.uploadedBy = entity.uploadedBy;
    dto.metadata = entity.metadata as Record<string, unknown> | null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
