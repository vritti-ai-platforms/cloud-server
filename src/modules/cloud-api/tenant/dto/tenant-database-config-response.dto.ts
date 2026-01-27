import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TenantDatabaseConfig } from '@/db/schema';

/**
 * Response DTO for tenant database configuration
 * Excludes sensitive fields (dbUsername, dbPassword) for security
 */
export class TenantDatabaseConfigResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the database configuration',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Reference to the parent tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  tenantId: string;

  // Database connection details (sanitized - no credentials)
  @ApiProperty({
    description: 'Database server hostname or IP address',
    example: 'db.acme-corp.example.com',
  })
  dbHost: string;

  @ApiProperty({
    description: 'Database server port number',
    example: 5432,
    minimum: 1,
    maximum: 65535,
  })
  dbPort: number;

  @ApiProperty({
    description: 'Name of the database',
    example: 'acme_corp_db',
  })
  dbName: string;

  @ApiPropertyOptional({
    description: 'Database schema name (for databases that support schemas)',
    example: 'tenant_schema',
    nullable: true,
  })
  dbSchema?: string | null;

  @ApiProperty({
    description: 'SSL mode for database connection security',
    enum: ['require', 'prefer', 'disable'],
    example: 'require',
  })
  dbSslMode: string;

  @ApiProperty({
    description: 'Maximum number of connections in the database connection pool',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  connectionPoolSize: number;

  // Metadata
  @ApiProperty({
    description: 'Timestamp when the configuration was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the configuration was last updated',
    example: '2024-01-20T14:45:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  constructor(partial: Partial<TenantDatabaseConfigResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from TenantDatabaseConfig model, excluding sensitive fields
   * Explicitly excludes: dbUsername, dbPassword
   */
  static from(config: TenantDatabaseConfig): TenantDatabaseConfigResponseDto {
    return new TenantDatabaseConfigResponseDto({
      id: config.id,
      tenantId: config.tenantId,
      dbHost: config.dbHost,
      dbPort: config.dbPort,
      dbName: config.dbName,
      dbSchema: config.dbSchema,
      dbSslMode: config.dbSslMode,
      connectionPoolSize: config.connectionPoolSize,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      // Explicitly exclude: dbUsername, dbPassword
    });
  }
}
