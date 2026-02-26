import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Industry } from '@/db/schema';
import { industries } from '@/db/schema';

@Injectable()
export class AdminIndustryRepository extends PrimaryBaseRepository<typeof industries> {
  constructor(database: PrimaryDatabaseService) {
    super(database, industries);
  }

  // Returns all industries ordered by name ascending
  async findAll(): Promise<Industry[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Finds an industry by its unique identifier
  async findById(id: string): Promise<Industry | undefined> {
    return this.model.findFirst({ where: { id } });
  }
}
