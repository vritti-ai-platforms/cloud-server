import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { UserModule } from '../user/user.module';
import { OnboardingController } from './controllers/onboarding.controller';
import { TwoFactorController } from './controllers/two-factor.controller';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { TwoFactorAuthRepository } from './repositories/two-factor-auth.repository';
import { EmailVerificationService } from './services/email-verification.service';
import { OnboardingService } from './services/onboarding.service';
import { OtpService } from './services/otp.service';
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
  controllers: [OnboardingController, TwoFactorController],
  providers: [
    // Core services
    OnboardingService,
    EmailVerificationService,
    OtpService,
    TotpService,
    TwoFactorAuthService,
    WebAuthnService,

    // Repositories
    EmailVerificationRepository,
    TwoFactorAuthRepository,
  ],
  exports: [OnboardingService, EmailVerificationService, TwoFactorAuthService, WebAuthnService, TwoFactorAuthRepository],
})
export class OnboardingModule {}
