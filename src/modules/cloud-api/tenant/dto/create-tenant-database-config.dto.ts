import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/**
 * DTO for creating tenant database configuration
 * Contains database connection details for DEDICATED tenants
 */
export class CreateTenantDatabaseConfigDto {
  @IsString()
  @MinLength(1)
  dbHost: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  dbPort: number;

  @IsString()
  @MinLength(1)
  dbUsername: string;

  @IsString()
  @MinLength(1)
  dbPassword: string;

  @IsString()
  @MinLength(1)
  dbName: string;

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
