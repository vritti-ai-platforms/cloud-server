import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';

@Module({
  imports: [MediaModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository, OrganizationMemberRepository],
  exports: [OrganizationService],
})
export class OrganizationModule {}
