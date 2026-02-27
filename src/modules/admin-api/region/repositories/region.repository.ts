import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Region } from '@/db/schema';
import { regions } from '@/db/schema';

@Injectable()
export class RegionRepository extends PrimaryBaseRepository<typeof regions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, regions);
  }

  // Returns all regions ordered by name ascending
  async findAll(): Promise<Region[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Finds a region by its unique identifier
  async findById(id: string): Promise<Region | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Finds a region by its unique code
  async findByCode(code: string): Promise<Region | undefined> {
    return this.model.findFirst({ where: { code } });
  }
}
