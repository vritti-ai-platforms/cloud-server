import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { MfaModule } from '../mfa/mfa.module';
import { SessionRepository } from '../auth/root/repositories/session.repository';
import { JwtAuthService } from '../auth/root/services/jwt.service';
import { SessionService } from '../auth/root/services/session.service';
import { UserModule } from '../user/user.module';
import { VerificationModule } from '../verification/verification.module';
import { EmailVerificationController } from './email-verification/controllers/email-verification.controller';
import { EmailVerificationService } from './email-verification/services/email-verification.service';
import { MobileVerificationController } from './mobile-verification/controllers/mobile-verification.controller';
import { VerificationWebhookController } from './mobile-verification/controllers/verification-webhook.controller';
import {
  SMSInboundProvider,
  SMSOtpProvider,
  VerificationProviderFactory,
  WhatsAppProvider,
} from './mobile-verification/providers';
import { MobileVerificationService } from './mobile-verification/services/mobile-verification.service';
import { SseConnectionService } from './mobile-verification/services/sse-connection.service';
import { VerificationEventListener } from './mobile-verification/services/verification-event.listener';
import { PasskeySetupController } from './passkey/controllers/passkey-setup.controller';
import { PasskeySetupService } from './passkey/services/passkey-setup.service';
import { OnboardingController } from './root/controllers/onboarding.controller';
import { MfaStatusController } from './root/controllers/mfa-status.controller';
import { OnboardingService } from './root/services/onboarding.service';
import { MfaStatusService } from './root/services/mfa-status.service';
import { TotpSetupController } from './totp/controllers/totp-setup.controller';
import { TotpSetupService } from './totp/services/totp-setup.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    MfaModule,
    forwardRef(() => UserModule),
    VerificationModule,
  ],
  controllers: [
    OnboardingController,
    EmailVerificationController,
    MobileVerificationController,
    VerificationWebhookController,
    TotpSetupController,
    PasskeySetupController,
    MfaStatusController,
  ],
  providers: [
    // Root
    OnboardingService,
    MfaStatusService,
    // Email verification
    EmailVerificationService,
    // Mobile verification
    MobileVerificationService,
    WhatsAppProvider,
    SMSInboundProvider,
    SMSOtpProvider,
    VerificationProviderFactory,
    SseConnectionService,
    VerificationEventListener,
    // TOTP setup
    TotpSetupService,
    // Passkey setup
    PasskeySetupService,
    // Auth (needed for session management during onboarding)
    SessionService,
    JwtAuthService,
    SessionRepository,
  ],
  exports: [
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    VerificationProviderFactory,
  ],
})
export class OnboardingModule {}
