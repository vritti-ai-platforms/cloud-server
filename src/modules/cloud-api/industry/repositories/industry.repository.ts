import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Industry } from '@/db/schema';
import { industries } from '@/db/schema';

@Injectable()
export class IndustryRepository extends PrimaryBaseRepository<typeof industries> {
  constructor(database: PrimaryDatabaseService) {
    super(database, industries);
  }

  // Returns all industries in the table
  async findAll(): Promise<Industry[]> {
    return this.model.findMany({});
  }
}
