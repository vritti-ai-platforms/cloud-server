import { Module } from '@nestjs/common';
import { RoleController, PermissionsController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [RoleController, PermissionsController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
