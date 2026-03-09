import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SelectOptionsQueryDto, SuccessResponseDto, UserId, type SelectQueryResult } from '@vritti/api-sdk';
import {
  ApiCreateIndustry,
  ApiDeleteIndustry,
  ApiFindForTableIndustries,
  ApiFindIndustriesSelect,
  ApiFindIndustryById,
  ApiUpdateIndustry,
} from '../docs/industry.docs';
import { IndustryDto } from '../dto/entity/industry.dto';
import { CreateIndustryDto } from '../dto/request/create-industry.dto';
import { UpdateIndustryDto } from '../dto/request/update-industry.dto';
import { IndustryTableResponseDto } from '../dto/response/industries-response.dto';
import { IndustryService } from '../services/industry.service';

@ApiTags('Admin - Industries')
@ApiBearerAuth()
@Controller('industries')
export class IndustryController {
  private readonly logger = new Logger(IndustryController.name);

  constructor(private readonly industryService: IndustryService) {}

  // Creates a new industry
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateIndustry()
  create(@Body() dto: CreateIndustryDto): Promise<SuccessResponseDto> {
    this.logger.log('POST /admin-api/industries');
    return this.industryService.create(dto);
  }

  // Returns industries for the data table with server-stored filter/sort/search/pagination state
  @Get('table')
  @ApiFindForTableIndustries()
  findForTable(
    @UserId() userId: string,
    @Query('searchColumn') searchColumn?: string,
    @Query('searchValue') searchValue?: string,
  ): Promise<IndustryTableResponseDto> {
    this.logger.log('GET /admin-api/industries/table');
    return this.industryService.findForTable(userId, searchColumn, searchValue);
  }

  // Returns paginated industry options for the select component
  @Get('select')
  @ApiFindIndustriesSelect()
  findForSelect(@Query() query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    this.logger.log('GET /admin-api/industries/select');
    return this.industryService.findForSelect(query);
  }

  // Returns a single industry by ID
  @Get(':id')
  @ApiFindIndustryById()
  findById(@Param('id') id: string): Promise<IndustryDto> {
    this.logger.log(`GET /admin-api/industries/${id}`);
    return this.industryService.findById(id);
  }

  // Updates an industry by ID
  @Patch(':id')
  @ApiUpdateIndustry()
  update(@Param('id') id: string, @Body() dto: UpdateIndustryDto): Promise<SuccessResponseDto> {
    this.logger.log(`PATCH /admin-api/industries/${id}`);
    return this.industryService.update(id, dto);
  }

  // Deletes an industry by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteIndustry()
  delete(@Param('id') id: string): Promise<SuccessResponseDto> {
    this.logger.log(`DELETE /admin-api/industries/${id}`);
    return this.industryService.delete(id);
  }
}
