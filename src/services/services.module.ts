import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { NexusApiService } from './nexus-api.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';

// Provides cloud-server-specific services for encryption, SMS, WhatsApp, and Nexus API
@Module({
  providers: [EncryptionService, NexusApiService, SmsService, WhatsAppService],
  exports: [EncryptionService, NexusApiService, SmsService, WhatsAppService],
})
export class ServicesModule {}
