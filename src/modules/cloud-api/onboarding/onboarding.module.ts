import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SseAuthGuard } from '@vritti/api-sdk';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { SessionRepository } from '../auth/root/repositories/session.repository';
import { JwtAuthService } from '../auth/root/services/jwt.service';
import { SessionService } from '../auth/root/services/session.service';
import { UserModule } from '../user/user.module';
import { VerificationModule } from '../verification/verification.module';
import { EmailVerificationController } from './email-verification/controllers/email-verification.controller';
import { EmailVerificationService } from './email-verification/services/email-verification.service';
import { MobileVerificationController } from './mobile-verification/controllers/mobile-verification.controller';
import { VerificationSseController } from './mobile-verification/controllers/verification-sse.controller';
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
import { OnboardingController } from './root/controllers/onboarding.controller';
import { OnboardingService } from './root/services/onboarding.service';
import { TwoFactorController } from './two-factor/controllers/two-factor.controller';
import { TwoFactorAuthRepository } from './two-factor/repositories/two-factor-auth.repository';
import { TotpService } from './two-factor/services/totp.service';
import { TwoFactorAuthService } from './two-factor/services/two-factor-auth.service';
import { WebAuthnService } from './two-factor/services/webauthn.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    forwardRef(() => UserModule), // Import UserModule to use UserService
    VerificationModule, // Import VerificationModule for VerificationService
  ],
  controllers: [
    OnboardingController,
    EmailVerificationController,
    MobileVerificationController,
    VerificationWebhookController,
    VerificationSseController,
    TwoFactorController,
  ],
  providers: [
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    SessionService,
    WhatsAppProvider,
    SMSInboundProvider,
    SMSOtpProvider,
    VerificationProviderFactory,
    TotpService,
    TwoFactorAuthService,
    WebAuthnService,
    JwtAuthService,

    SessionRepository,

    SseConnectionService,
    VerificationEventListener,
    SseAuthGuard,
    TwoFactorAuthRepository,
  ],
  exports: [
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    VerificationProviderFactory,
    TwoFactorAuthService,
    WebAuthnService,
    TwoFactorAuthRepository,
    TotpService,
  ],
})
export class OnboardingModule {}
