import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiCreatePrice,
  ApiDeletePrice,
  ApiFindAllPrices,
  ApiFindPriceById,
  ApiFindPricesByPlan,
  ApiUpdatePrice,
} from '../docs/price.docs';
import { PriceDto } from '../dto/entity/price.dto';
import { CreatePriceDto } from '../dto/request/create-price.dto';
import { UpdatePriceDto } from '../dto/request/update-price.dto';
import { PriceService } from '../services/price.service';

@ApiTags('Admin - Prices')
@ApiBearerAuth()
@Controller('prices')
export class PriceController {
  private readonly logger = new Logger(PriceController.name);

  constructor(private readonly priceService: PriceService) {}

  // Creates a new price entry
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePrice()
  create(@Body() dto: CreatePriceDto): Promise<PriceDto> {
    this.logger.log('POST /admin-api/prices');
    return this.priceService.create(dto);
  }

  // Returns all prices
  @Get()
  @ApiFindAllPrices()
  findAll(): Promise<PriceDto[]> {
    this.logger.log('GET /admin-api/prices');
    return this.priceService.findAll();
  }

  // Returns all prices for a given plan
  @Get('plan/:planId')
  @ApiFindPricesByPlan()
  findByPlanId(@Param('planId') planId: string): Promise<PriceDto[]> {
    this.logger.log(`GET /admin-api/prices/plan/${planId}`);
    return this.priceService.findByPlanId(planId);
  }

  // Returns a single price by ID
  @Get(':id')
  @ApiFindPriceById()
  findById(@Param('id') id: string): Promise<PriceDto> {
    this.logger.log(`GET /admin-api/prices/${id}`);
    return this.priceService.findById(id);
  }

  // Updates a price by ID
  @Patch(':id')
  @ApiUpdatePrice()
  update(@Param('id') id: string, @Body() dto: UpdatePriceDto): Promise<PriceDto> {
    this.logger.log(`PATCH /admin-api/prices/${id}`);
    return this.priceService.update(id, dto);
  }

  // Deletes a price by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeletePrice()
  delete(@Param('id') id: string): Promise<PriceDto> {
    this.logger.log(`DELETE /admin-api/prices/${id}`);
    return this.priceService.delete(id);
  }
}
