import { Module } from '@nestjs/common';
import { CloudDeploymentController } from './controllers/deployment.controller';
import { CloudDeploymentRepository } from './repositories/deployment.repository';
import { CloudDeploymentService } from './services/deployment.service';

@Module({
  controllers: [CloudDeploymentController],
  providers: [CloudDeploymentService, CloudDeploymentRepository],
})
export class CloudDeploymentModule {}
