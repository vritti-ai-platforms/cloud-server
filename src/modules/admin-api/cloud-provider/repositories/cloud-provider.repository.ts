import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq, type SQL } from '@vritti/api-sdk/drizzle-orm';
import type { CloudProvider } from '@/db/schema';
import { cloudProviders, deployments, regionCloudProviders } from '@/db/schema';

@Injectable()
export class CloudProviderRepository extends PrimaryBaseRepository<typeof cloudProviders> {
  constructor(database: PrimaryDatabaseService) {
    super(database, cloudProviders);
  }

  // Returns all providers ordered by name ascending
  async findAll(): Promise<CloudProvider[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Returns paginated providers with region/deployment counts and the total filtered count
  async findAllWithCounts(
    where?: SQL,
    orderBy?: SQL[],
    limit?: number,
    offset?: number,
  ): Promise<{ rows: Array<CloudProvider & { regionCount: number; deploymentCount: number }>; total: number }> {
    const [countResult, rows] = await Promise.all([
      this.db.select({ total: count() }).from(cloudProviders).where(where).then((r) => r[0]?.total ?? 0),
      this.db
        .select({
          id: cloudProviders.id,
          name: cloudProviders.name,
          code: cloudProviders.code,
          logoUrl: cloudProviders.logoUrl,
          logoDarkUrl: cloudProviders.logoDarkUrl,
          createdAt: cloudProviders.createdAt,
          updatedAt: cloudProviders.updatedAt,
          regionCount: count(regionCloudProviders.regionId),
          deploymentCount: count(deployments.id),
        })
        .from(cloudProviders)
        .leftJoin(regionCloudProviders, eq(regionCloudProviders.providerId, cloudProviders.id))
        .leftJoin(deployments, eq(deployments.cloudProviderId, cloudProviders.id))
        .where(where)
        .groupBy(cloudProviders.id)
        .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(cloudProviders.name)]))
        .limit(limit ?? 20)
        .offset(offset ?? 0),
    ]);
    return { rows: rows as Array<CloudProvider & { regionCount: number; deploymentCount: number }>, total: Number(countResult) };
  }

  // Finds a provider by its unique identifier
  async findById(id: string): Promise<CloudProvider | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  async findByCode(code: string): Promise<CloudProvider | undefined> {
    return this.model.findFirst({ where: { code } });
  }

  // Returns a single provider with region/deployment counts, or undefined if not found
  async findOneWithCounts(id: string): Promise<(CloudProvider & { regionCount: number; deploymentCount: number }) | undefined> {
    const [row] = await this.db
      .select({
        id: cloudProviders.id,
        name: cloudProviders.name,
        code: cloudProviders.code,
        logoUrl: cloudProviders.logoUrl,
        logoDarkUrl: cloudProviders.logoDarkUrl,
        createdAt: cloudProviders.createdAt,
        updatedAt: cloudProviders.updatedAt,
        regionCount: count(regionCloudProviders.regionId),
        deploymentCount: count(deployments.id),
      })
      .from(cloudProviders)
      .leftJoin(regionCloudProviders, eq(regionCloudProviders.providerId, cloudProviders.id))
      .leftJoin(deployments, eq(deployments.cloudProviderId, cloudProviders.id))
      .where(eq(cloudProviders.id, id))
      .groupBy(cloudProviders.id)
      .limit(1);
    return row as (CloudProvider & { regionCount: number; deploymentCount: number }) | undefined;
  }
}
