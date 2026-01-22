import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { UserModule } from '../user/user.module';
import { OnboardingController } from './controllers/onboarding.controller';
import { VerificationWebhookController } from './controllers/verification-webhook.controller';
import {
  SMSInboundProvider,
  SMSOtpProvider,
  VerificationProviderFactory,
  WhatsAppProvider,
} from './providers';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { MobileVerificationRepository } from './repositories/mobile-verification.repository';
import { EmailVerificationService } from './services/email-verification.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { OnboardingService } from './services/onboarding.service';
import { OtpService } from './services/otp.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    UserModule, // Import UserModule to use UserService
  ],
  controllers: [OnboardingController, VerificationWebhookController],
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

    // Repositories
    EmailVerificationRepository,
    MobileVerificationRepository,
  ],
  exports: [
    OnboardingService,
    EmailVerificationService,
    MobileVerificationService,
    VerificationProviderFactory,
  ],
})
export class OnboardingModule {}
