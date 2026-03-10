import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, asc, count, eq, SQL, sql } from '@vritti/api-sdk/drizzle-orm';
import { cloudProviders, Price, prices, regions } from '@/db/schema';
import { PriceWithRelations } from '../dto/entity/price-detail.dto';

@Injectable()
export class PriceRepository extends PrimaryBaseRepository<typeof prices> {
  constructor(database: PrimaryDatabaseService) {
    super(database, prices);
  }

  // Returns all prices ordered by creation date descending
  async findAll(): Promise<Price[]> {
    return this.model.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // Finds a price by its unique identifier
  async findById(id: string): Promise<Price | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Returns all prices for a given plan
  async findByPlanId(planId: string): Promise<Price[]> {
    return this.model.findMany({ where: { planId } });
  }

  // Returns all prices for a plan joined with region and provider names
  async findByPlanIdWithRelations(planId: string): Promise<PriceWithRelations[]> {
    return (await this.model.findMany({
      where: { planId },
      with: { region: true, cloudProvider: true },
    })) as unknown as PriceWithRelations[];
  }

  // Returns paginated prices for a plan with JOINs, applying where/orderBy/limit/offset
  async findByPlanIdWithFilters(
    planId: string,
    where?: SQL,
    orderBy?: SQL[],
    limit?: number,
    offset?: number,
  ): Promise<{ rows: PriceWithRelations[]; total: number }> {
    const planCondition = eq(prices.planId, planId);
    const fullWhere = where ? and(planCondition, where) : planCondition;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(prices)
        .leftJoin(regions, eq(prices.regionId, regions.id))
        .leftJoin(cloudProviders, eq(prices.providerId, cloudProviders.id))
        .where(fullWhere)
        .then((r) => r[0]?.total ?? 0),
      this.db
        .select({
          id: prices.id,
          planId: prices.planId,
          industryId: prices.industryId,
          regionId: prices.regionId,
          region: {
            name: regions.name,
            code: regions.code,
          },
          providerId: prices.providerId,
          cloudProvider: {
            name: cloudProviders.name,
            code: cloudProviders.code,
          },
          price: prices.price,
          currency: prices.currency,
          createdAt: prices.createdAt,
          updatedAt: prices.updatedAt,
        })
        .from(prices)
        .leftJoin(regions, eq(prices.regionId, regions.id))
        .leftJoin(cloudProviders, eq(prices.providerId, cloudProviders.id))
        .where(fullWhere)
        .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(prices.createdAt)]))
        .limit(limit ?? 20)
        .offset(offset ?? 0),
    ]);
    return { rows: rows as PriceWithRelations[], total: Number(countResult) };
  }

  // Finds a price matching the exact plan + industry + region + provider combination
  async findByComposite(planId: string, industryId: string, regionId: string, providerId: string) {
    return this.model.findFirst({ where: { planId, industryId, regionId, providerId } });
  }

  // Returns the number of prices referencing the given region
  async countByRegionId(regionId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(prices)
      .where(eq(prices.regionId, regionId));
    return Number(result[0]?.count ?? 0);
  }
}
