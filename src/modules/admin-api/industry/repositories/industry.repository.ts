import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, inArray, sql } from '@vritti/api-sdk/drizzle-orm';
import type { Industry } from '@/db/schema';
import { deploymentIndustryPlans, industries, organizations, prices } from '@/db/schema';

@Injectable()
export class IndustryRepository extends PrimaryBaseRepository<typeof industries> {
  constructor(database: PrimaryDatabaseService) {
    super(database, industries);
  }

  // Returns all industries ordered by name ascending
  async findAll(): Promise<Industry[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Finds an industry by its unique identifier
  async findById(id: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Finds an industry by its unique code
  async findByCode(code: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { code } });
  }

  // Returns a set of industry IDs that have at least one reference (cannot be deleted)
  async findReferencedIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const [orgs, pricesList, plans] = await Promise.all([
      this.db.select({ id: organizations.industryId }).from(organizations).where(inArray(organizations.industryId, ids)),
      this.db.select({ id: prices.industryId }).from(prices).where(inArray(prices.industryId, ids)),
      this.db
        .select({ id: deploymentIndustryPlans.industryId })
        .from(deploymentIndustryPlans)
        .where(inArray(deploymentIndustryPlans.industryId, ids)),
    ]);
    const referenced = new Set<string>();
    for (const row of [...orgs, ...pricesList, ...plans]) {
      if (row.id) referenced.add(row.id);
    }
    return referenced;
  }

  // Counts references to this industry across organizations, prices, and deployment plans
  async countReferences(id: string): Promise<{ organizations: number; prices: number; deploymentPlans: number }> {
    const [orgsResult, pricesResult, plansResult] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(organizations).where(eq(organizations.industryId, id)),
      this.db.select({ count: sql<number>`count(*)` }).from(prices).where(eq(prices.industryId, id)),
      this.db.select({ count: sql<number>`count(*)` }).from(deploymentIndustryPlans).where(eq(deploymentIndustryPlans.industryId, id)),
    ]);
    return {
      organizations: Number(orgsResult[0]?.count ?? 0),
      prices: Number(pricesResult[0]?.count ?? 0),
      deploymentPlans: Number(plansResult[0]?.count ?? 0),
    };
  }
}
