import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';

// Provides cloud-server-specific services for encryption, SMS, and WhatsApp
@Module({
  providers: [EncryptionService, SmsService, WhatsAppService],
  exports: [EncryptionService, SmsService, WhatsAppService],
})
export class ServicesModule {}
