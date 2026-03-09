import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Plan } from '@/db/schema';
import { deploymentIndustryPlans, organizations, plans, prices } from '@/db/schema';

@Injectable()
export class PlanRepository extends PrimaryBaseRepository<typeof plans> {
  constructor(database: PrimaryDatabaseService) {
    super(database, plans);
  }

  // Returns all plans ordered by name ascending
  async findAll(): Promise<Plan[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Finds a plan by its unique identifier
  async findById(id: string): Promise<Plan | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Finds a plan by its unique code
  async findByCode(code: string): Promise<Plan | undefined> {
    return this.model.findFirst({ where: { code } });
  }

  // Returns true if any table references this plan (prices, deployment_industry_plans, or organizations)
  async isReferenced(planId: string): Promise<boolean> {
    const [priceRows, deploymentRows, orgRows] = await Promise.all([
      this.db.select({ n: count(prices.id) }).from(prices).where(eq(prices.planId, planId)),
      this.db
        .select({ n: count(deploymentIndustryPlans.planId) })
        .from(deploymentIndustryPlans)
        .where(eq(deploymentIndustryPlans.planId, planId)),
      this.db.select({ n: count(organizations.id) }).from(organizations).where(eq(organizations.planId, planId)),
    ]);
    return (
      Number(priceRows[0]?.n ?? 0) + Number(deploymentRows[0]?.n ?? 0) + Number(orgRows[0]?.n ?? 0) > 0
    );
  }

  // Returns reference counts across all dependent tables for a given plan
  async getReferenceCounts(planId: string): Promise<{ priceCount: number; deploymentCount: number; orgCount: number }> {
    const [priceRows, deploymentRows, orgRows] = await Promise.all([
      this.db.select({ n: count(prices.id) }).from(prices).where(eq(prices.planId, planId)),
      this.db
        .select({ n: count(deploymentIndustryPlans.planId) })
        .from(deploymentIndustryPlans)
        .where(eq(deploymentIndustryPlans.planId, planId)),
      this.db.select({ n: count(organizations.id) }).from(organizations).where(eq(organizations.planId, planId)),
    ]);
    return {
      priceCount: Number(priceRows[0]?.n ?? 0),
      deploymentCount: Number(deploymentRows[0]?.n ?? 0),
      orgCount: Number(orgRows[0]?.n ?? 0),
    };
  }

  // Returns all plans with a count of associated prices
  async findAllWithCounts(): Promise<Array<Plan & { priceCount: number }>> {
    const rows = await this.db
      .select({
        id: plans.id,
        name: plans.name,
        code: plans.code,
        createdAt: plans.createdAt,
        updatedAt: plans.updatedAt,
        priceCount: count(prices.id),
      })
      .from(plans)
      .leftJoin(prices, eq(prices.planId, plans.id))
      .groupBy(plans.id)
      .orderBy(asc(plans.name));
    return rows as Array<Plan & { priceCount: number }>;
  }
}
