import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';
import { TenantDatabaseConfigRepository } from './tenant-database-config.repository';
import { TenantDatabaseConfigService } from './tenant-database-config.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, TenantRepository, TenantDatabaseConfigService, TenantDatabaseConfigRepository],
  exports: [TenantService, TenantRepository, TenantDatabaseConfigService, TenantDatabaseConfigRepository],
})
export class TenantModule {}
