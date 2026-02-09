import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { DatabaseType, TenantStatus } from '@/db/schema';
import { DatabaseTypeValues, TenantStatusValues } from '@/db/schema';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Unique subdomain identifier for the tenant. Used in URLs and routing.',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiProperty({
    description: 'Display name of the tenant organization',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the tenant organization',
    example: 'Leading provider of innovative solutions',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Database deployment type for the tenant',
    enum: ['SHARED', 'DEDICATED'],
    example: 'SHARED',
  })
  @IsEnum(DatabaseTypeValues)
  dbType: DatabaseType;

  @ApiPropertyOptional({
    description: 'Current operational status of the tenant',
    enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
    example: 'ACTIVE',
    default: 'ACTIVE',
  })
  @IsEnum(TenantStatusValues)
  @IsOptional()
  status?: TenantStatus;

  // Database connection details
  @ApiPropertyOptional({
    description: 'Database server hostname or IP address (required for DEDICATED tenants)',
    example: 'db.acme-corp.example.com',
  })
  @IsString()
  @IsOptional()
  dbHost?: string;

  @ApiPropertyOptional({
    description: 'Database server port number',
    example: 5432,
    minimum: 1,
    maximum: 65535,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  dbPort?: number;

  @ApiPropertyOptional({
    description: 'Database username for authentication',
    example: 'tenant_user',
  })
  @IsString()
  @IsOptional()
  dbUsername?: string;

  @ApiPropertyOptional({
    description: 'Database password for authentication',
    example: 'secure_password_123',
  })
  @IsString()
  @IsOptional()
  dbPassword?: string;

  @ApiPropertyOptional({
    description: 'Name of the database to connect to',
    example: 'acme_corp_db',
  })
  @IsString()
  @IsOptional()
  dbName?: string;

  @ApiPropertyOptional({
    description: 'Database schema name (for databases that support schemas)',
    example: 'tenant_schema',
  })
  @IsString()
  @IsOptional()
  dbSchema?: string;

  @ApiPropertyOptional({
    description: 'SSL mode for database connection security',
    enum: ['require', 'prefer', 'disable'],
    example: 'require',
  })
  @IsString()
  @IsOptional()
  @IsIn(['require', 'prefer', 'disable'])
  dbSslMode?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of connections in the database connection pool',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  connectionPoolSize?: number;
}
