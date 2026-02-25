import { Module } from '@nestjs/common';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, OrganizationMemberRepository],
  exports: [OrganizationService],
})
export class OrganizationModule {}
