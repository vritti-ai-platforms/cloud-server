import { Global, Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { EncryptionService } from './services/encryption.service';

/**
 * Common module providing shared services
 * @Global decorator makes these services available throughout the application
 */
@Global()
@Module({
  providers: [EmailService, SmsService, EncryptionService],
  exports: [EmailService, SmsService, EncryptionService],
})
export class CommonModule {}
