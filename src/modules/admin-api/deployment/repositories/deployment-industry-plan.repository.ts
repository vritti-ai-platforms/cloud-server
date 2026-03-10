import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { deploymentIndustryPlans, deployments, industries, plans, prices } from '@/db/schema';
import type { DeploymentPlanAssignmentDto } from '../dto/entity/deployment-plan-assignment.dto';

@Injectable()
export class DeploymentIndustryPlanRepository extends PrimaryBaseRepository<typeof deploymentIndustryPlans> {
  constructor(database: PrimaryDatabaseService) {
    super(database, deploymentIndustryPlans);
  }

  // Returns all available plans with prices and assignment status for the deployment
  async findPlanAssignmentsForDeployment(deploymentId: string): Promise<DeploymentPlanAssignmentDto[]> {
    const dep = await this.db
      .select({ regionId: deployments.regionId, cloudProviderId: deployments.cloudProviderId })
      .from(deployments)
      .where(eq(deployments.id, deploymentId))
      .limit(1);

    if (!dep[0]) return [];
    const { regionId, cloudProviderId } = dep[0];

    const rows = await this.db
      .select({
        planId: prices.planId,
        planName: plans.name,
        planCode: plans.code,
        industryId: prices.industryId,
        industryName: industries.name,
        price: prices.price,
        currency: prices.currency,
        assignedDeploymentId: deploymentIndustryPlans.deploymentId,
      })
      .from(prices)
      .innerJoin(plans, eq(prices.planId, plans.id))
      .innerJoin(industries, eq(prices.industryId, industries.id))
      .leftJoin(
        deploymentIndustryPlans,
        and(
          eq(deploymentIndustryPlans.deploymentId, deploymentId),
          eq(deploymentIndustryPlans.planId, prices.planId),
          eq(deploymentIndustryPlans.industryId, prices.industryId),
        ),
      )
      .where(and(eq(prices.regionId, regionId), eq(prices.providerId, cloudProviderId)));

    // Group rows by plan, collecting industries array with assignment status per plan
    const planMap = new Map<string, DeploymentPlanAssignmentDto>();
    for (const r of rows) {
      if (!planMap.has(r.planId)) {
        planMap.set(r.planId, { planId: r.planId, planName: r.planName, planCode: r.planCode, industries: [] });
      }
      planMap.get(r.planId)!.industries.push({
        industryId: r.industryId,
        industryName: r.industryName,
        price: r.price ?? null,
        currency: r.currency ?? null,
        isAssigned: r.assignedDeploymentId !== null,
      });
    }
    return Array.from(planMap.values());
  }

}
