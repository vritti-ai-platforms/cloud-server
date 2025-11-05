/**
 * Response DTO for tenant database configuration
 * Excludes sensitive fields (dbUsername, dbPassword) for security
 */
export class TenantDatabaseConfigResponseDto {
  id: string;
  tenantId: string;

  // Database connection details (sanitized - no credentials)
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbSchema?: string | null;
  dbSslMode: string;
  connectionPoolSize: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TenantDatabaseConfigResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from Prisma TenantDatabaseConfig model, excluding sensitive fields
   * Explicitly excludes: dbUsername, dbPassword
   */
  static fromPrisma(config: any): TenantDatabaseConfigResponseDto {
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
