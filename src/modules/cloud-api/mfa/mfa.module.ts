import { Module } from '@nestjs/common';
import { EncryptionService } from '../../../services';
import { BackupCodeService } from './services/backup-code.service';
import { TotpService } from './services/totp.service';
import { WebAuthnService } from './services/webauthn.service';
import { MfaRepository } from './repositories/mfa.repository';

@Module({
  providers: [TotpService, WebAuthnService, BackupCodeService, MfaRepository, EncryptionService],
  exports: [TotpService, WebAuthnService, BackupCodeService, MfaRepository],
})
export class MfaModule {}
