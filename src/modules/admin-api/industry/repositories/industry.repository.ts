import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, type SQL } from '@vritti/api-sdk/drizzle-orm';
import type { Industry } from '@/db/schema';
import { industries } from '@/db/schema';

@Injectable()
export class IndustryRepository extends PrimaryBaseRepository<typeof industries> {
  constructor(database: PrimaryDatabaseService) {
    super(database, industries);
  }

  // Returns all industries ordered by name ascending
  async findAll(): Promise<Industry[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Returns industries with optional where/orderBy conditions from FilterProcessor
  async findFiltered(where?: SQL, orderBy?: SQL[]): Promise<Industry[]> {
    return this.db
      .select()
      .from(industries)
      .where(where)
      .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(industries.name)])) as Promise<Industry[]>;
  }

  // Finds an industry by its unique identifier
  async findById(id: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Finds an industry by its unique code
  async findByCode(code: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { code } });
  }

  // Finds an industry by its unique slug
  async findBySlug(slug: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { slug } });
  }
}
