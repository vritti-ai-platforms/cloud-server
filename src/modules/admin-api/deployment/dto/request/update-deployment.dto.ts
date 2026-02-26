import { PartialType } from '@nestjs/swagger';
import { CreateDeploymentDto } from './create-deployment.dto';

export class UpdateDeploymentDto extends PartialType(CreateDeploymentDto) {}
