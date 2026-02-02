import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { BusinessUnitService } from './business-unit.service';
import { CreateBusinessUnitDto, BusinessUnitResponseDto } from './dto';

@ApiTags('Business Units')
@ApiBearerAuth()
@Controller('companies/:companyId/business-units')
export class BusinessUnitController {
  private readonly logger = new Logger(BusinessUnitController.name);

  constructor(private readonly businessUnitService: BusinessUnitService) {}

  @Get()
  @ApiOperation({ summary: 'List all business units in a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, type: [BusinessUnitResponseDto] })
  async findAll(@Param('companyId') companyId: string): Promise<BusinessUnitResponseDto[]> {
    this.logger.log(`GET /companies/${companyId}/business-units`);
    return this.businessUnitService.findByCompanyId(companyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a business unit' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({ type: CreateBusinessUnitDto })
  @ApiResponse({ status: 201, type: BusinessUnitResponseDto })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBusinessUnitDto,
    @UserId() userId: string,
  ): Promise<BusinessUnitResponseDto> {
    this.logger.log(`POST /companies/${companyId}/business-units - Creating '${dto.name}'`);
    return this.businessUnitService.create(companyId, dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business unit details' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Business Unit ID' })
  @ApiResponse({ status: 200, type: BusinessUnitResponseDto })
  async findById(@Param('id') id: string): Promise<BusinessUnitResponseDto> {
    return this.businessUnitService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a business unit' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Business Unit ID' })
  @ApiResponse({ status: 200, type: BusinessUnitResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBusinessUnitDto>,
    @UserId() userId: string,
  ): Promise<BusinessUnitResponseDto> {
    this.logger.log(`PATCH /business-units/${id}`);
    return this.businessUnitService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a business unit' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Business Unit ID' })
  @ApiResponse({ status: 204, description: 'Business unit deleted' })
  async delete(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    this.logger.log(`DELETE /business-units/${id}`);
    return this.businessUnitService.delete(id, userId);
  }
}
