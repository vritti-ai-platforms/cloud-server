import { Injectable, Logger } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';
import type { NewActivityLog } from '@/db/schema';

export interface LogActivityParams {
  companyId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async log(params: LogActivityParams): Promise<void> {
    try {
      const logEntry: NewActivityLog = {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      };

      await this.activityLogRepository.create(logEntry);
      this.logger.debug(`Activity logged: ${params.action} on ${params.entityType}`);
    } catch (error) {
      // Don't throw - activity logging should not break main operations
      this.logger.error(`Failed to log activity: ${error}`);
    }
  }

  async getCompanyActivity(companyId: string, limit = 50, offset = 0) {
    return this.activityLogRepository.findByCompanyId(companyId, limit, offset);
  }

  async getEntityActivity(entityId: string, limit = 50) {
    return this.activityLogRepository.findByEntityId(entityId, limit);
  }

  async getUserActivity(userId: string, limit = 50) {
    return this.activityLogRepository.findByUserId(userId, limit);
  }
}
