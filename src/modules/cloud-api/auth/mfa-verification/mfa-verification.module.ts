import { forwardRef, Module } from '@nestjs/common';
import { OnboardingModule } from '../../onboarding/onboarding.module';
import { UserModule } from '../../user/user.module';
import { AuthModule } from '../auth.module';
import { MfaChallengeStore } from './mfa-challenge.store';
import { MfaVerificationController } from './mfa-verification.controller';
import { MfaVerificationService } from './mfa-verification.service';

/**
 * MFA Verification Module
 * Handles multi-factor authentication verification during login flow
 */
@Module({
  imports: [
    forwardRef(() => AuthModule), // For SessionService
    forwardRef(() => OnboardingModule), // For TotpService, OtpService, WebAuthnService, TwoFactorAuthRepository
    UserModule,
  ],
  controllers: [MfaVerificationController],
  providers: [MfaVerificationService, MfaChallengeStore],
  exports: [MfaVerificationService, MfaChallengeStore],
})
export class MfaVerificationModule {}
