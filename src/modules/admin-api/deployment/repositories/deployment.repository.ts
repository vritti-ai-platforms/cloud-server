import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Deployment } from '@/db/schema';
import { deployments } from '@/db/schema';

@Injectable()
export class DeploymentRepository extends PrimaryBaseRepository<typeof deployments> {
  constructor(database: PrimaryDatabaseService) {
    super(database, deployments);
  }

  // Returns all deployments ordered by name ascending
  async findAll(): Promise<Deployment[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Finds a deployment by its unique identifier
  async findById(id: string): Promise<Deployment | undefined> {
    return this.model.findFirst({ where: { id } });
  }
}
