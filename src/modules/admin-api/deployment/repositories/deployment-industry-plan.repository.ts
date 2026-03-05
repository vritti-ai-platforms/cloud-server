import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { deploymentIndustryPlans, industries, plans } from '@/db/schema';
import type { DeploymentPlanListItemDto } from '../dto/entity/deployment-plan-list-item.dto';

@Injectable()
export class DeploymentIndustryPlanRepository {
  constructor(private readonly database: PrimaryDatabaseService) {}

  // Inserts a deployment-plan-industry assignment; skips duplicates via onConflictDoNothing
  async insert(deploymentId: string, planId: string, industryId: string): Promise<number> {
    const result = await this.database.drizzleClient
      .insert(deploymentIndustryPlans)
      .values({ deploymentId, planId, industryId })
      .onConflictDoNothing();
    return result.rowCount ?? 1;
  }

  // Removes a deployment-plan-industry assignment
  async remove(deploymentId: string, planId: string, industryId: string): Promise<void> {
    await this.database.drizzleClient
      .delete(deploymentIndustryPlans)
      .where(
        and(
          eq(deploymentIndustryPlans.deploymentId, deploymentId),
          eq(deploymentIndustryPlans.planId, planId),
          eq(deploymentIndustryPlans.industryId, industryId),
        ),
      );
  }

  // Returns plan+industry assignments for a deployment with names joined
  async findByDeploymentId(deploymentId: string): Promise<DeploymentPlanListItemDto[]> {
    return this.database.drizzleClient
      .select({
        planId: deploymentIndustryPlans.planId,
        planName: plans.name,
        planCode: plans.code,
        industryId: deploymentIndustryPlans.industryId,
        industryName: industries.name,
      })
      .from(deploymentIndustryPlans)
      .innerJoin(plans, eq(deploymentIndustryPlans.planId, plans.id))
      .innerJoin(industries, eq(deploymentIndustryPlans.industryId, industries.id))
      .where(eq(deploymentIndustryPlans.deploymentId, deploymentId));
  }
}
