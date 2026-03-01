import { Module } from '@nestjs/common';
import { TableViewModule } from '../cloud-api/table-view/table-view.module';
import { CloudProviderController } from './cloud-provider/controllers/cloud-provider.controller';
import { CloudProviderRepository } from './cloud-provider/repositories/cloud-provider.repository';
import { CloudProviderService } from './cloud-provider/services/cloud-provider.service';
import { DeploymentController } from './deployment/controllers/deployment.controller';
import { DeploymentRepository } from './deployment/repositories/deployment.repository';
import { DeploymentIndustryPlanRepository } from './deployment/repositories/deployment-industry-plan.repository';
import { DeploymentService } from './deployment/services/deployment.service';
import { IndustryController } from './industry/controllers/industry.controller';
import { IndustryRepository } from './industry/repositories/industry.repository';
import { IndustryService } from './industry/services/industry.service';
import { PlanController } from './plan/controllers/plan.controller';
import { PlanRepository } from './plan/repositories/plan.repository';
import { PlanService } from './plan/services/plan.service';
import { PriceController } from './price/controllers/price.controller';
import { PriceRepository } from './price/repositories/price.repository';
import { PriceService } from './price/services/price.service';
import { RegionController } from './region/controllers/region.controller';
import { RegionRepository } from './region/repositories/region.repository';
import { RegionProviderRepository } from './region/repositories/region-provider.repository';
import { RegionService } from './region/services/region.service';

@Module({
  imports: [TableViewModule],
  controllers: [
    CloudProviderController,
    DeploymentController,
    RegionController,
    IndustryController,
    PlanController,
    PriceController,
  ],
  providers: [
    // Cloud Provider
    CloudProviderService,
    CloudProviderRepository,
    // Deployment
    DeploymentService,
    DeploymentRepository,
    DeploymentIndustryPlanRepository,
    // Region
    RegionService,
    RegionRepository,
    RegionProviderRepository,
    // Industry
    IndustryService,
    IndustryRepository,
    // Plan
    PlanService,
    PlanRepository,
    // Price
    PriceService,
    PriceRepository,
  ],
  exports: [DeploymentRepository],
})
export class AdminApiModule {}
