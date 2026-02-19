import { Module } from '@nestjs/common';
import { ServicesModule } from '../../../services';
import { VerificationRepository } from './repositories/verification.repository';
import { OtpService } from './services/otp.service';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [ServicesModule],
  providers: [VerificationService, VerificationRepository, OtpService],
  exports: [VerificationService, OtpService],
})
export class VerificationModule {}
