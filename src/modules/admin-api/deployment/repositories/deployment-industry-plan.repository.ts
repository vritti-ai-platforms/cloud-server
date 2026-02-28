import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { deploymentIndustryPlans } from '@/db/schema';

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
}
