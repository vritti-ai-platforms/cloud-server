import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Deployment } from '@/db/schema';
import { cloudProviders, deployments, regions } from '@/db/schema';

export type DeploymentWithNames = Deployment & {
  regionName: string;
  regionCode: string;
  cloudProviderName: string;
  cloudProviderCode: string;
};

@Injectable()
export class DeploymentRepository extends PrimaryBaseRepository<typeof deployments> {
  constructor(database: PrimaryDatabaseService) {
    super(database, deployments);
  }

  // Returns all deployments with region and cloud provider names joined
  async findAll(): Promise<DeploymentWithNames[]> {
    return this.db
      .select({
        id: deployments.id,
        name: deployments.name,
        nexusUrl: deployments.nexusUrl,
        webhookSecret: deployments.webhookSecret,
        regionId: deployments.regionId,
        cloudProviderId: deployments.cloudProviderId,
        status: deployments.status,
        type: deployments.type,
        createdAt: deployments.createdAt,
        updatedAt: deployments.updatedAt,
        regionName: regions.name,
        regionCode: regions.code,
        cloudProviderName: cloudProviders.name,
        cloudProviderCode: cloudProviders.code,
      })
      .from(deployments)
      .innerJoin(regions, eq(deployments.regionId, regions.id))
      .innerJoin(cloudProviders, eq(deployments.cloudProviderId, cloudProviders.id))
      .orderBy(asc(deployments.name)) as Promise<DeploymentWithNames[]>;
  }

  // Finds a deployment by its unique identifier
  async findById(id: string): Promise<Deployment | undefined> {
    return this.model.findFirst({ where: { id } });
  }
}
