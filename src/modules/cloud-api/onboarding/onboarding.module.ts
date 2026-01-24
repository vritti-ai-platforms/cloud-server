import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SseAuthGuard } from '@vritti/api-sdk';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { UserModule } from '../user/user.module';
import { OnboardingController } from './controllers/onboarding.controller';
import { TwoFactorController } from './controllers/two-factor.controller';
import { VerificationSseController } from './controllers/verification-sse.controller';
import { VerificationWebhookController } from './controllers/verification-webhook.controller';
import {
  SMSInboundProvider,
  SMSOtpProvider,
  VerificationProviderFactory,
  WhatsAppProvider,
} from './providers';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { MobileVerificationRepository } from './repositories/mobile-verification.repository';
import { TwoFactorAuthRepository } from './repositories/two-factor-auth.repository';
import { EmailVerificationService } from './services/email-verification.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { OnboardingService } from './services/onboarding.service';
import { OtpService } from './services/otp.service';
import { SseConnectionService } from './services/sse-connection.service';
import { VerificationEventListener } from './services/verification-event.listener';
import { TotpService } from './services/totp.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { WebAuthnService } from './services/webauthn.service';

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
    // Core services
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    OtpService,

    // Verification providers
    WhatsAppProvider,
    SMSInboundProvider,
    SMSOtpProvider,
    VerificationProviderFactory,
    TotpService,
    TwoFactorAuthService,
    WebAuthnService,

    // Repositories
    EmailVerificationRepository,
    MobileVerificationRepository,

    // SSE services
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
  ],
})
export class OnboardingModule {}
