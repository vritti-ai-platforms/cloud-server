import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { UserModule } from '../user/user.module';
import { OnboardingController } from './controllers/onboarding.controller';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { EmailVerificationService } from './services/email-verification.service';
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
