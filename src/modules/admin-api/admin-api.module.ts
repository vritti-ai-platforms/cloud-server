import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment/controllers/deployment.controller';
import { DeploymentRepository } from './deployment/repositories/deployment.repository';
import { DeploymentService } from './deployment/services/deployment.service';
import { AdminIndustryController } from './industry/controllers/industry.controller';
import { AdminIndustryRepository } from './industry/repositories/industry.repository';
import { AdminIndustryService } from './industry/services/industry.service';
import { PlanController } from './plan/controllers/plan.controller';
import { PlanRepository } from './plan/repositories/plan.repository';
import { PlanService } from './plan/services/plan.service';

@Module({
  controllers: [AdminIndustryController, PlanController, DeploymentController],
  providers: [
    // Industry
    AdminIndustryService, AdminIndustryRepository,
    // Plan
    PlanService, PlanRepository,
    // Deployment
    DeploymentService, DeploymentRepository,
  ],
  exports: [DeploymentRepository],
})
export class AdminApiModule {}
