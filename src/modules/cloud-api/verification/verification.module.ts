import { Module } from '@nestjs/common';
import { ServicesModule } from '../../../services';
import { VerificationRepository } from './repositories/verification.repository';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [ServicesModule],
  providers: [VerificationService, VerificationRepository],
  exports: [VerificationService],
})
export class VerificationModule {}
