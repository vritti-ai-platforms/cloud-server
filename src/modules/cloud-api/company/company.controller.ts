import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CreateCompanyResponseDto,
} from './dto';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'List companies the user belongs to' })
  @ApiResponse({ status: 200, type: [CompanyResponseDto] })
  async findUserCompanies(@UserId() userId: string): Promise<CompanyResponseDto[]> {
    this.logger.log(`GET /companies - User ${userId}`);
    return this.companyService.findByUserId(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, type: CreateCompanyResponseDto })
  async create(
    @Body() dto: CreateCompanyDto,
    @UserId() userId: string,
  ): Promise<CreateCompanyResponseDto> {
    this.logger.log(`POST /companies - Creating '${dto.name}'`);
    return this.companyService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company details' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  async findById(@Param('id') id: string): Promise<CompanyResponseDto> {
    return this.companyService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @UserId() userId: string,
  ): Promise<CompanyResponseDto> {
    this.logger.log(`PATCH /companies/${id}`);
    return this.companyService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/archive company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 204, description: 'Company deleted' })
  async delete(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    this.logger.log(`DELETE /companies/${id}`);
    return this.companyService.delete(id, userId);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get company activity logs' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getActivity(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.companyService.getActivity(id, limit || 50, offset || 0);
  }
}
