import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Plan } from '@/db/schema';
import { plans, prices } from '@/db/schema';

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
