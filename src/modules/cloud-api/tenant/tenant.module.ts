import { Module } from '@nestjs/common';
import { TenantController } from './controllers/tenant.controller';
import { TenantRepository } from './repositories/tenant.repository';
import { TenantDatabaseConfigRepository } from './repositories/tenant-database-config.repository';
import { TenantService } from './services/tenant.service';
import { TenantDatabaseConfigService } from './services/tenant-database-config.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, TenantRepository, TenantDatabaseConfigService, TenantDatabaseConfigRepository],
  exports: [TenantService, TenantRepository, TenantDatabaseConfigService, TenantDatabaseConfigRepository],
})
export class TenantModule {}
