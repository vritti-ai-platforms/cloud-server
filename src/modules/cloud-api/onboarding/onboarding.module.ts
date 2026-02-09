import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SseAuthGuard } from '@vritti/api-sdk';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { UserModule } from '../user/user.module';
import { OnboardingController } from './root/controllers/onboarding.controller';
import { EmailVerificationRepository } from './root/repositories/email-verification.repository';
import { EmailVerificationService } from './root/services/email-verification.service';
import { OnboardingService } from './root/services/onboarding.service';
import { OtpService } from './root/services/otp.service';
import { TwoFactorController } from './two-factor/controllers/two-factor.controller';
import { TwoFactorAuthRepository } from './two-factor/repositories/two-factor-auth.repository';
import { TotpService } from './two-factor/services/totp.service';
import { TwoFactorAuthService } from './two-factor/services/two-factor-auth.service';
import { WebAuthnService } from './two-factor/services/webauthn.service';
import { VerificationSseController } from './mobile-verification/controllers/verification-sse.controller';
import { VerificationWebhookController } from './mobile-verification/controllers/verification-webhook.controller';
import {
  SMSInboundProvider,
  SMSOtpProvider,
  VerificationProviderFactory,
  WhatsAppProvider,
} from './mobile-verification/providers';
import { MobileVerificationRepository } from './mobile-verification/repositories/mobile-verification.repository';
import { MobileVerificationService } from './mobile-verification/services/mobile-verification.service';
import { SseConnectionService } from './mobile-verification/services/sse-connection.service';
import { VerificationEventListener } from './mobile-verification/services/verification-event.listener';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    UserModule, // Import UserModule to use UserService
  ],
  controllers: [OnboardingController, VerificationWebhookController, VerificationSseController, TwoFactorController],
  providers: [
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    OtpService,

    WhatsAppProvider,
    SMSInboundProvider,
    SMSOtpProvider,
    VerificationProviderFactory,
    TotpService,
    TwoFactorAuthService,
    WebAuthnService,

    EmailVerificationRepository,
    MobileVerificationRepository,

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
    OtpService,
    EmailVerificationRepository,
    MobileVerificationRepository,
  ],
})
export class OnboardingModule {}
