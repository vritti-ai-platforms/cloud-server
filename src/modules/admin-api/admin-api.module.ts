import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment/controllers/deployment.controller';
import { DeploymentRepository } from './deployment/repositories/deployment.repository';
import { DeploymentService } from './deployment/services/deployment.service';
import { ProviderController } from './provider/controllers/provider.controller';
import { ProviderRepository } from './provider/repositories/provider.repository';
import { ProviderService } from './provider/services/provider.service';

@Module({
  controllers: [ProviderController, DeploymentController],
  providers: [ProviderService, ProviderRepository, DeploymentService, DeploymentRepository],
  exports: [DeploymentRepository],
})
export class AdminApiModule {}
