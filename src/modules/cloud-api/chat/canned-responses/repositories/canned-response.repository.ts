import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { type CannedResponse, cannedResponses } from '@/db/schema';

@Injectable()
export class CannedResponseRepository extends PrimaryBaseRepository<typeof cannedResponses> {
  constructor(database: PrimaryDatabaseService) {
    super(database, cannedResponses);
  }

  async findAllByTenantId(tenantId: string): Promise<CannedResponse[]> {
    return this.model.findMany({
      where: { tenantId },
      orderBy: { shortCode: 'asc' },
    });
  }

  async findByIdAndTenantId(id: string, tenantId: string): Promise<CannedResponse | undefined> {
    return this.model.findFirst({
      where: { id, tenantId },
    });
  }
}
