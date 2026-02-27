import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Price } from '@/db/schema';
import { prices } from '@/db/schema';

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
}
