import { Module } from '@nestjs/common';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { CommonModule } from './common/common.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TenantModule,
    CommonModule,
    UserModule,
    OnboardingModule,
    AuthModule,
  ],
  exports: [
    TenantModule,
    CommonModule,
    UserModule,
    OnboardingModule,
    AuthModule,
  ],
})
export class CloudApiModule {}
