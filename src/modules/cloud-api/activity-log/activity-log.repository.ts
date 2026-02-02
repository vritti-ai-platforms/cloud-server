import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { activityLogs } from '@/db/schema';

@Injectable()
export class ActivityLogRepository extends PrimaryBaseRepository<typeof activityLogs> {
  constructor(database: PrimaryDatabaseService) {
    super(database, activityLogs);
  }

  async findByCompanyId(companyId: string, limit = 50, offset = 0) {
    return this.model.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      limit,
      offset,
    });
  }

  async findByEntityId(entityId: string, limit = 50) {
    return this.model.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      limit,
    });
  }

  async findByUserId(userId: string, limit = 50) {
    return this.model.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit,
    });
  }
}
