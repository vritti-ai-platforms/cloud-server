import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';
import type { CloudProvider, Deployment, Region } from '@/db/schema';
import { deployments, organizations } from '@/db/schema';

export type DeploymentWithNames = Deployment & {
  region: Region;
  cloudProvider: CloudProvider;
};

@Injectable()
export class DeploymentRepository extends PrimaryBaseRepository<typeof deployments> {
  constructor(database: PrimaryDatabaseService) {
    super(database, deployments);
  }

  // Returns all deployments with region and cloud provider names joined
  async findAll(): Promise<DeploymentWithNames[]> {
    return (await this.model.findMany({
      with: { region: true, cloudProvider: true },
      orderBy: { name: 'asc' },
    })) as unknown as DeploymentWithNames[];
  }

  // Finds a deployment by its unique identifier
  async findById(id: string): Promise<Deployment | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Returns the number of deployments referencing the given region
  async countByRegionId(regionId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(deployments)
      .where(eq(deployments.regionId, regionId));
    return Number(result[0]?.count ?? 0);
  }

  // Returns the number of organizations associated with the given deployment
  async countOrganizationsByDeploymentId(deploymentId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(eq(organizations.deploymentId, deploymentId));
    return Number(result[0]?.count ?? 0);
  }

  // Returns a map of cloudProviderId → deployment count for deployments in the given region
  async countByRegionGroupedByProvider(regionId: string): Promise<Map<string, number>> {
    const results = await this.db
      .select({ cloudProviderId: deployments.cloudProviderId, count: sql<number>`count(*)` })
      .from(deployments)
      .where(eq(deployments.regionId, regionId))
      .groupBy(deployments.cloudProviderId);
    const map = new Map<string, number>();
    for (const row of results) {
      map.set(row.cloudProviderId, Number(row.count));
    }
    return map;
  }
}
