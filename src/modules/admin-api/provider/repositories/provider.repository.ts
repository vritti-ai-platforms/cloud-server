import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Provider } from '@/db/schema';
import { providers } from '@/db/schema';

@Injectable()
export class ProviderRepository extends PrimaryBaseRepository<typeof providers> {
  constructor(database: PrimaryDatabaseService) {
    super(database, providers);
  }

  // Returns all providers ordered by name ascending
  async findAll(): Promise<Provider[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Finds a provider by its unique identifier
  async findById(id: string): Promise<Provider | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  async findByCode(code: string): Promise<Provider | undefined> {
    return this.model.findFirst({ where: { code } });
  }
}
