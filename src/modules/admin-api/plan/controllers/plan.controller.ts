import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCreatePlan, ApiDeletePlan, ApiFindAllPlans, ApiFindPlanById, ApiUpdatePlan } from '../docs/plan.docs';
import { PlanDto } from '../dto/entity/plan.dto';
import { CreatePlanDto } from '../dto/request/create-plan.dto';
import { UpdatePlanDto } from '../dto/request/update-plan.dto';
import { PlanService } from '../services/plan.service';

@ApiTags('Admin - Plans')
@ApiBearerAuth()
@Controller('plans')
export class PlanController {
  private readonly logger = new Logger(PlanController.name);

  constructor(private readonly planService: PlanService) {}

  // Creates a new plan
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePlan()
  create(@Body() dto: CreatePlanDto): Promise<PlanDto> {
    this.logger.log('POST /admin-api/plans');
    return this.planService.create(dto);
  }

  // Returns all plans
  @Get()
  @ApiFindAllPlans()
  findAll(): Promise<PlanDto[]> {
    this.logger.log('GET /admin-api/plans');
    return this.planService.findAll();
  }

  // Returns a single plan by ID
  @Get(':id')
  @ApiFindPlanById()
  findById(@Param('id') id: string): Promise<PlanDto> {
    this.logger.log(`GET /admin-api/plans/${id}`);
    return this.planService.findById(id);
  }

  // Updates a plan by ID
  @Patch(':id')
  @ApiUpdatePlan()
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto): Promise<PlanDto> {
    this.logger.log(`PATCH /admin-api/plans/${id}`);
    return this.planService.update(id, dto);
  }

  // Deletes a plan by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeletePlan()
  delete(@Param('id') id: string): Promise<PlanDto> {
    this.logger.log(`DELETE /admin-api/plans/${id}`);
    return this.planService.delete(id);
  }
}
