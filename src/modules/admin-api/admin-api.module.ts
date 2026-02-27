import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment/controllers/deployment.controller';
import { DeploymentRepository } from './deployment/repositories/deployment.repository';
import { DeploymentService } from './deployment/services/deployment.service';
import { ProviderController } from './provider/controllers/provider.controller';
import { ProviderRepository } from './provider/repositories/provider.repository';
import { ProviderService } from './provider/services/provider.service';
import { RegionController } from './region/controllers/region.controller';
import { RegionProviderRepository } from './region/repositories/region-provider.repository';
import { RegionRepository } from './region/repositories/region.repository';
import { RegionService } from './region/services/region.service';

@Module({
  controllers: [ProviderController, DeploymentController, RegionController],
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
  ],
  exports: [DeploymentRepository],
})
export class AdminApiModule {}
