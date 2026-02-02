import { Module } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogService } from './activity-log.service';

@Module({
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService, ActivityLogRepository],
})
export class ActivityLogModule {}
