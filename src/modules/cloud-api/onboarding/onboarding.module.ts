import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ServicesModule } from '../../../services';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingService } from './services/onboarding.service';
import { EmailVerificationService } from './services/email-verification.service';
import { OtpService } from './services/otp.service';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { UserModule } from '../user/user.module';
import { jwtConfigFactory } from '../../../config/jwt.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    UserModule, // Import UserModule to use UserService
  ],
  controllers: [OnboardingController],
  providers: [
    // Core services
    OnboardingService,
    EmailVerificationService,
    OtpService,

    // Repositories
    EmailVerificationRepository,
  ],
  exports: [OnboardingService, EmailVerificationService],
})
export class OnboardingModule {}
