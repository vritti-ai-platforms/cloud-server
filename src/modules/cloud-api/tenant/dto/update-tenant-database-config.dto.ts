import { PartialType } from '@nestjs/swagger';
import { CreateTenantDatabaseConfigDto } from './create-tenant-database-config.dto';

/**
 * DTO for updating tenant database configuration
 * All fields are optional (partial of CreateTenantDatabaseConfigDto)
 */
export class UpdateTenantDatabaseConfigDto extends PartialType(CreateTenantDatabaseConfigDto) {}
