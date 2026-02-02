import { Module, forwardRef } from '@nestjs/common';
import { BusinessUnitController } from './business-unit.controller';
import { BusinessUnitService } from './business-unit.service';
import { BusinessUnitRepository } from './business-unit.repository';
import { CompanyModule } from '../company/company.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    forwardRef(() => CompanyModule),
    ActivityLogModule,
  ],
  controllers: [BusinessUnitController],
  providers: [BusinessUnitService, BusinessUnitRepository],
  exports: [BusinessUnitService, BusinessUnitRepository],
})
export class BusinessUnitModule {}
