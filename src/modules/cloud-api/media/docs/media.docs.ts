import { applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MediaDto } from '../dto/entity/media.dto';
import { BatchUploadResponseDto } from '../dto/response/batch-upload-response.dto';
import { PresignedUrlResponseDto } from '../dto/response/presigned-url-response.dto';

export function ApiUploadSingle() {
  return applyDecorators(
    ApiOperation({ summary: 'Upload a single file' }),
    ApiConsumes('multipart/form-data'),
    ApiQuery({ name: 'entityType', required: false, description: 'Entity type to associate with' }),
    ApiQuery({ name: 'entityId', required: false, description: 'Entity ID to associate with' }),
    ApiQuery({ name: 'subEntityType', required: false, description: 'Sub-entity type' }),
    ApiResponse({ status: 201, description: 'File uploaded successfully.', type: MediaDto }),
    ApiResponse({ status: 400, description: 'Invalid file type, file too large, or no file provided.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiUploadBatch() {
  return applyDecorators(
    ApiOperation({ summary: 'Upload multiple files (max 10)' }),
    ApiConsumes('multipart/form-data'),
    ApiQuery({ name: 'entityType', required: false, description: 'Entity type to associate with' }),
    ApiQuery({ name: 'entityId', required: false, description: 'Entity ID to associate with' }),
    ApiQuery({ name: 'subEntityType', required: false, description: 'Sub-entity type' }),
    ApiResponse({ status: 201, description: 'Files uploaded successfully.', type: BatchUploadResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid files or exceeded batch limit.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get media metadata by ID' }),
    ApiParam({ name: 'id', description: 'Media ID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Media metadata.', type: MediaDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Media not found.' }),
  );
}

export function ApiGetMediaUrl() {
  return applyDecorators(
    ApiOperation({ summary: 'Get presigned download URL' }),
    ApiParam({ name: 'id', description: 'Media ID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Presigned URL generated.', type: PresignedUrlResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Media not found.' }),
  );
}

export function ApiDownloadMedia() {
  return applyDecorators(
    ApiOperation({ summary: 'Download/stream a file' }),
    ApiParam({ name: 'id', description: 'Media ID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'File stream.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Media not found.' }),
  );
}

export function ApiDeleteMedia() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a media item' }),
    ApiParam({ name: 'id', description: 'Media ID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 204, description: 'Media deleted.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Media not found.' }),
  );
}

export function ApiFindByEntity() {
  return applyDecorators(
    ApiOperation({ summary: 'Query media by entity type and ID' }),
    ApiQuery({ name: 'entityType', required: true, description: 'Entity type to filter by' }),
    ApiQuery({ name: 'entityId', required: true, description: 'Entity ID to filter by' }),
    ApiQuery({ name: 'subEntityType', required: false, description: 'Sub-entity type filter' }),
    ApiResponse({ status: 200, description: 'List of media items.', type: [MediaDto] }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
