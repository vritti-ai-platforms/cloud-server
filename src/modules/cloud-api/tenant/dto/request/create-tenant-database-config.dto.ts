import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTenantDatabaseConfigDto {
  @ApiProperty({
    description: 'Database server hostname or IP address',
    example: 'db.acme-corp.example.com',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  dbHost: string;

  @ApiProperty({
    description: 'Database server port number',
    example: 5432,
    minimum: 1,
    maximum: 65535,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  dbPort: number;

  @ApiProperty({
    description: 'Database username for authentication',
    example: 'tenant_user',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  dbUsername: string;

  @ApiProperty({
    description: 'Database password for authentication',
    example: 'secure_password_123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  dbPassword: string;

  @ApiProperty({
    description: 'Name of the database to connect to',
    example: 'acme_corp_db',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  dbName: string;

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
    default: 'prefer',
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
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  connectionPoolSize?: number;
}
