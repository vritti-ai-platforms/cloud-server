import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCreateDeployment, ApiDeleteDeployment, ApiFindAllDeployments, ApiFindDeploymentById, ApiUpdateDeployment } from '../docs/deployment.docs';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { DeploymentService } from '../services/deployment.service';

@ApiTags('Admin - Deployments')
@ApiBearerAuth()
@Controller('deployments')
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  constructor(private readonly deploymentService: DeploymentService) {}

  // Creates a new deployment
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateDeployment()
  create(@Body() dto: CreateDeploymentDto): Promise<DeploymentDto> {
    this.logger.log('POST /admin-api/deployments');
    return this.deploymentService.create(dto);
  }

  // Returns all deployments
  @Get()
  @ApiFindAllDeployments()
  findAll(): Promise<DeploymentDto[]> {
    this.logger.log('GET /admin-api/deployments');
    return this.deploymentService.findAll();
  }

  // Returns a single deployment by ID
  @Get(':id')
  @ApiFindDeploymentById()
  findById(@Param('id') id: string): Promise<DeploymentDto> {
    this.logger.log(`GET /admin-api/deployments/${id}`);
    return this.deploymentService.findById(id);
  }

  // Updates a deployment by ID
  @Patch(':id')
  @ApiUpdateDeployment()
  update(@Param('id') id: string, @Body() dto: UpdateDeploymentDto): Promise<DeploymentDto> {
    this.logger.log(`PATCH /admin-api/deployments/${id}`);
    return this.deploymentService.update(id, dto);
  }

  // Deletes a deployment by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteDeployment()
  delete(@Param('id') id: string): Promise<DeploymentDto> {
    this.logger.log(`DELETE /admin-api/deployments/${id}`);
    return this.deploymentService.delete(id);
  }
}
