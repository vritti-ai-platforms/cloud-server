import { forwardRef, Module } from '@nestjs/common';
import { EmailService, EncryptionService } from '@/services';
import { AuthModule } from '../auth/auth.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { ContactChangeController } from './controllers/contact-change.controller';
import { ChangeRequestRateLimitRepository } from './repositories/change-request-rate-limit.repository';
import { EmailChangeRequestRepository } from './repositories/email-change-request.repository';
import { PhoneChangeRequestRepository } from './repositories/phone-change-request.repository';
import { EmailChangeService } from './services/email-change.service';
import { RateLimitService } from './services/rate-limit.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => OnboardingModule)],
  controllers: [UserController, ContactChangeController],
  providers: [
    UserService,
    UserRepository,
    EmailChangeService,
    RateLimitService,
    EmailChangeRequestRepository,
    PhoneChangeRequestRepository,
    ChangeRequestRateLimitRepository,
    EmailService,
    EncryptionService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
