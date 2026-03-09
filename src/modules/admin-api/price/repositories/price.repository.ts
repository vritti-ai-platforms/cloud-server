import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, and, eq, sql, type SQL } from '@vritti/api-sdk/drizzle-orm';
import type { Price } from '@/db/schema';
import { cloudProviders, prices, regions } from '@/db/schema';
import type { PriceWithRelations } from '../dto/entity/price-detail.dto';

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
    return this.db
      .select({
        id: prices.id,
        planId: prices.planId,
        industryId: prices.industryId,
        regionId: prices.regionId,
        regionName: regions.name,
        regionCode: regions.code,
        providerId: prices.providerId,
        providerName: cloudProviders.name,
        providerCode: cloudProviders.code,
        price: prices.price,
        currency: prices.currency,
        createdAt: prices.createdAt,
        updatedAt: prices.updatedAt,
      })
      .from(prices)
      .leftJoin(regions, eq(prices.regionId, regions.id))
      .leftJoin(cloudProviders, eq(prices.providerId, cloudProviders.id))
      .where(eq(prices.planId, planId));
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
          regionName: regions.name,
          regionCode: regions.code,
          providerId: prices.providerId,
          providerName: cloudProviders.name,
          providerCode: cloudProviders.code,
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
