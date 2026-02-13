import { PartialType } from '@nestjs/swagger';
import { CreateTenantDatabaseConfigDto } from './create-tenant-database-config.dto';

export class UpdateTenantDatabaseConfigDto extends PartialType(CreateTenantDatabaseConfigDto) {}
