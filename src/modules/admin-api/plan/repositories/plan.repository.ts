import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Plan } from '@/db/schema';
import { plans } from '@/db/schema';

@Injectable()
export class PlanRepository extends PrimaryBaseRepository<typeof plans> {
  constructor(database: PrimaryDatabaseService) {
    super(database, plans);
  }

  // Returns all plans ordered by name ascending
  async findAll(): Promise<Plan[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Finds a plan by its unique identifier
  async findById(id: string): Promise<Plan | undefined> {
    return this.model.findFirst({ where: { id } });
  }
}
