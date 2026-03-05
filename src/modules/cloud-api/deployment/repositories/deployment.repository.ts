import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { deploymentIndustryPlans, deployments, plans, prices } from '@/db/schema';
import type { DeploymentOptionDto } from '../dto/response/deployment-option.dto';
import type { PlanOptionDto } from '../dto/response/plan-option.dto';

@Injectable()
export class CloudDeploymentRepository {
  constructor(private readonly database: PrimaryDatabaseService) {}

  // Returns active deployments that have at least one plan assigned for the given region, provider, and industry
  async findActive(regionId: string, cloudProviderId: string, industryId: string): Promise<DeploymentOptionDto[]> {
    const rows = await this.database.drizzleClient
      .selectDistinct({
        id: deployments.id,
        name: deployments.name,
        type: deployments.type,
      })
      .from(deployments)
      .innerJoin(
        deploymentIndustryPlans,
        and(
          eq(deploymentIndustryPlans.deploymentId, deployments.id),
          eq(deploymentIndustryPlans.industryId, industryId),
        ),
      )
      .where(
        and(
          eq(deployments.regionId, regionId),
          eq(deployments.cloudProviderId, cloudProviderId),
          eq(deployments.status, 'active'),
        ),
      );
    return rows as DeploymentOptionDto[];
  }

  // Returns plans for a deployment+industry combo with price info from pricing matrix
  async findPlansForDeployment(deploymentId: string, industryId: string): Promise<PlanOptionDto[]> {
    // First get the deployment's region and provider for price lookup
    const deployment = await this.database.drizzleClient
      .select({
        regionId: deployments.regionId,
        cloudProviderId: deployments.cloudProviderId,
      })
      .from(deployments)
      .where(eq(deployments.id, deploymentId))
      .limit(1);

    if (!deployment[0]) return [];
    const { regionId, cloudProviderId } = deployment[0];

    const rows = await this.database.drizzleClient
      .select({
        id: plans.id,
        name: plans.name,
        code: plans.code,
        price: prices.price,
        currency: prices.currency,
      })
      .from(deploymentIndustryPlans)
      .innerJoin(plans, eq(deploymentIndustryPlans.planId, plans.id))
      .leftJoin(
        prices,
        and(
          eq(prices.planId, plans.id),
          eq(prices.industryId, industryId),
          eq(prices.regionId, regionId),
          eq(prices.providerId, cloudProviderId),
        ),
      )
      .where(
        and(
          eq(deploymentIndustryPlans.deploymentId, deploymentId),
          eq(deploymentIndustryPlans.industryId, industryId),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price ?? null,
      currency: r.currency ?? null,
    }));
  }
}
