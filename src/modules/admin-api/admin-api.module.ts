import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment/controllers/deployment.controller';
import { DeploymentRepository } from './deployment/repositories/deployment.repository';
import { DeploymentService } from './deployment/services/deployment.service';
import { IndustryController } from './industry/controllers/industry.controller';
import { IndustryRepository } from './industry/repositories/industry.repository';
import { IndustryService } from './industry/services/industry.service';
import { PlanController } from './plan/controllers/plan.controller';
import { PlanRepository } from './plan/repositories/plan.repository';
import { PlanService } from './plan/services/plan.service';
import { ProviderController } from './provider/controllers/provider.controller';
import { ProviderRepository } from './provider/repositories/provider.repository';
import { ProviderService } from './provider/services/provider.service';
import { RegionController } from './region/controllers/region.controller';
import { RegionProviderRepository } from './region/repositories/region-provider.repository';
import { RegionRepository } from './region/repositories/region.repository';
import { RegionService } from './region/services/region.service';

@Module({
  controllers: [ProviderController, DeploymentController, RegionController, IndustryController, PlanController],
  providers: [
    // Provider
    ProviderService,
    ProviderRepository,
    // Deployment
    DeploymentService,
    DeploymentRepository,
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
  ],
  exports: [DeploymentRepository],
})
export class AdminApiModule {}
