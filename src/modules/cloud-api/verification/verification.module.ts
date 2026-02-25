import { Module } from '@nestjs/common';
import { EncryptionService } from '../../../services';
import { VerificationRepository } from './repositories/verification.repository';
import { VerificationService } from './services/verification.service';

@Module({
  providers: [VerificationService, VerificationRepository, EncryptionService],
  exports: [VerificationService],
})
export class VerificationModule {}
