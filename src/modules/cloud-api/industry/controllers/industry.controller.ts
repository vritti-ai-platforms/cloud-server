import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SelectOptionsQueryDto, type SelectQueryResult } from '@vritti/api-sdk';
import { ApiGetIndustries, ApiGetIndustriesSelect } from '../docs/industry.docs';
import { IndustryDto } from '../dto/entity/industry.dto';
import { IndustryService } from '../services/industry.service';

@ApiTags('Industries')
@Controller('industries')
export class IndustryController {
  private readonly logger = new Logger(IndustryController.name);

  constructor(private readonly industryService: IndustryService) {}

  // Returns all available industry types
  @Get()
  @ApiGetIndustries()
  findAll(): Promise<IndustryDto[]> {
    this.logger.log('GET /industries');
    return this.industryService.findAll();
  }

  // Returns paginated industry options for select component
  @Get('select')
  @ApiGetIndustriesSelect()
  findForSelect(@Query() query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    this.logger.log('GET /industries/select');
    return this.industryService.findForSelect(query);
  }
}
