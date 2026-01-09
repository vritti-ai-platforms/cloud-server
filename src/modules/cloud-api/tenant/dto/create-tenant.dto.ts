import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { DatabaseType, TenantStatus } from '@/db/schema';
import { DatabaseTypeValues, TenantStatusValues } from '@/db/schema';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(DatabaseTypeValues)
  dbType: DatabaseType;

  @IsEnum(TenantStatusValues)
  @IsOptional()
  status?: TenantStatus;

  // Database connection details
  @IsString()
  @IsOptional()
  dbHost?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  dbPort?: number;

  @IsString()
  @IsOptional()
  dbUsername?: string;

  @IsString()
  @IsOptional()
  dbPassword?: string;

  @IsString()
  @IsOptional()
  dbName?: string;

  @IsString()
  @IsOptional()
  dbSchema?: string;

  @IsString()
  @IsOptional()
  @IsIn(['require', 'prefer', 'disable'])
  dbSslMode?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  connectionPoolSize?: number;
}
