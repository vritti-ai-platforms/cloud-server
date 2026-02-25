import { Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApiDeleteMedia,
  ApiDownloadMedia,
  ApiFindById,
  ApiFindByEntity,
  ApiGetMediaUrl,
  ApiUploadBatch,
  ApiUploadSingle,
} from '../docs/media.docs';
import type { MediaDto } from '../dto/entity/media.dto';
import { MediaQueryDto } from '../dto/request/media-query.dto';
import { UploadQueryDto } from '../dto/request/upload-query.dto';
import type { BatchUploadResponseDto } from '../dto/response/batch-upload-response.dto';
import type { PresignedUrlResponseDto } from '../dto/response/presigned-url-response.dto';
import { MediaService } from '../services/media.service';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  // Uploads a single file
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiUploadSingle()
  async uploadSingle(
    @Req() request: FastifyRequest,
    @UserId() userId: string,
    @Query() query: UploadQueryDto,
  ): Promise<MediaDto> {
    this.logger.log(`POST /media/upload - User: ${userId}`);
    return this.mediaService.uploadFromRequest(request, userId, query);
  }

  // Uploads multiple files
  @Post('upload/batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiUploadBatch()
  async uploadBatch(
    @Req() request: FastifyRequest,
    @UserId() userId: string,
    @Query() query: UploadQueryDto,
  ): Promise<BatchUploadResponseDto> {
    this.logger.log(`POST /media/upload/batch - User: ${userId}`);
    return this.mediaService.uploadBatchFromRequest(request, userId, query);
  }

  // Gets media metadata by ID
  @Get(':id')
  @ApiFindById()
  async findById(@Param('id') id: string): Promise<MediaDto> {
    this.logger.log(`GET /media/${id}`);
    return this.mediaService.findById(id);
  }

  // Gets a presigned download URL
  @Get(':id/url')
  @ApiGetMediaUrl()
  async getPresignedUrl(@Param('id') id: string): Promise<PresignedUrlResponseDto> {
    this.logger.log(`GET /media/${id}/url`);
    return this.mediaService.getPresignedUrl(id);
  }

  // Streams the file for download
  @Get(':id/download')
  @ApiDownloadMedia()
  async download(@Param('id') id: string, @Res() reply: FastifyReply): Promise<void> {
    this.logger.log(`GET /media/${id}/download`);

    const { stream, media } = await this.mediaService.getStream(id);

    reply.header('Content-Type', media.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${media.originalName}"`);
    reply.header('Content-Length', media.size);

    return reply.send(stream);
  }

  // Deletes a media item from storage and database
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteMedia()
  async remove(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    this.logger.log(`DELETE /media/${id} - User: ${userId}`);
    return this.mediaService.delete(id, userId);
  }

  // Queries media by entity type and entity ID
  @Get()
  @ApiFindByEntity()
  async findByEntity(@Query() query: MediaQueryDto): Promise<MediaDto[]> {
    this.logger.log(`GET /media?entityType=${query.entityType}&entityId=${query.entityId}`);
    return this.mediaService.findByEntity(query);
  }
}
