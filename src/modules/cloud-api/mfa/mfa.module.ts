import { Module } from '@nestjs/common';
import { ServicesModule } from '../../../services';
import { BackupCodeService } from './services/backup-code.service';
import { TotpService } from './services/totp.service';
import { WebAuthnService } from './services/webauthn.service';
import { MfaRepository } from './repositories/mfa.repository';

@Module({
  imports: [ServicesModule],
  providers: [TotpService, WebAuthnService, BackupCodeService, MfaRepository],
  exports: [TotpService, WebAuthnService, BackupCodeService, MfaRepository],
})
export class MfaModule {}
