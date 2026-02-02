import { Module, forwardRef } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyMemberController } from './company-member.controller';
import { CompanyService } from './company.service';
import { CompanyMemberService } from './company-member.service';
import { CompanyRepository } from './company.repository';
import { CompanyMemberRepository } from './company-member.repository';
import { TenantModule } from '../tenant/tenant.module';
import { RoleModule } from '../role/role.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    TenantModule,
    forwardRef(() => RoleModule),
    ActivityLogModule,
  ],
  controllers: [CompanyController, CompanyMemberController],
  providers: [
    CompanyService,
    CompanyMemberService,
    CompanyRepository,
    CompanyMemberRepository,
  ],
  exports: [
    CompanyService,
    CompanyMemberService,
    CompanyRepository,
    CompanyMemberRepository,
  ],
})
export class CompanyModule {}
