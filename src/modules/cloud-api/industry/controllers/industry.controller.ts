import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import { ApiGetIndustries } from '../docs/industry.docs';
import { IndustryDto } from '../dto/entity/industry.dto';
import { IndustryService } from '../services/industry.service';

@ApiTags('Industries')
@Controller('industries')
export class IndustryController {
  private readonly logger = new Logger(IndustryController.name);

  constructor(private readonly industryService: IndustryService) {}

  // Returns all available industry types
  @Get()
  @Public()
  @ApiGetIndustries()
  findAll(): Promise<IndustryDto[]> {
    this.logger.log('GET /industries');
    return this.industryService.findAll();
  }
}
