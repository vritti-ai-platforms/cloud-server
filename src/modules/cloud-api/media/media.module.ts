import { Module } from '@nestjs/common';
import { MediaController } from './controllers/media.controller';
import { MediaRepository } from './repositories/media.repository';
import { MediaService } from './services/media.service';
import { R2StorageProvider } from './storage/r2-storage.provider';
import { StorageFactory } from './storage/storage.factory';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaRepository, R2StorageProvider, StorageFactory],
  exports: [MediaService],
})
export class MediaModule {}
