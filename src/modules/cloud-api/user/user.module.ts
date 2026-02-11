import { forwardRef, Module } from '@nestjs/common';
import { EmailService, EncryptionService, SmsService } from '@/services';
import { AuthModule } from '../auth/auth.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { ContactChangeController } from './controllers/contact-change.controller';
import { UserController } from './controllers/user.controller';
import { ChangeRequestRateLimitRepository } from './repositories/change-request-rate-limit.repository';
import { EmailChangeRequestRepository } from './repositories/email-change-request.repository';
import { PhoneChangeRequestRepository } from './repositories/phone-change-request.repository';
import { EmailChangeService } from './services/email-change.service';
import { PhoneChangeService } from './services/phone-change.service';
import { RateLimitService } from './services/rate-limit.service';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => OnboardingModule)],
  controllers: [UserController, ContactChangeController],
  providers: [
    UserService,
    UserRepository,
    EmailChangeService,
    PhoneChangeService,
    RateLimitService,
    EmailChangeRequestRepository,
    PhoneChangeRequestRepository,
    ChangeRequestRateLimitRepository,
    EmailService,
    SmsService,
    EncryptionService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
