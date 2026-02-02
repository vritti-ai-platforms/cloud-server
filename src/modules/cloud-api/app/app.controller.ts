import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { Public, UserId } from '@vritti/api-sdk';
import { AppService } from './app.service';
import { AppResponseDto, ToggleAppResponseDto } from './dto';

@ApiTags('Apps')
@ApiBearerAuth()
@Controller('companies/:companyId/apps')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'List all apps with enabled status for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, type: [AppResponseDto] })
  async findAll(@Param('companyId') companyId: string): Promise<AppResponseDto[]> {
    this.logger.log(`GET /companies/${companyId}/apps`);
    return this.appService.findAllForCompany(companyId);
  }

  @Post(':appId/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable an app for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'appId', description: 'App ID' })
  @ApiResponse({ status: 200, type: ToggleAppResponseDto })
  async enable(
    @Param('companyId') companyId: string,
    @Param('appId') appId: string,
    @UserId() userId: string,
  ): Promise<ToggleAppResponseDto> {
    this.logger.log(`POST /companies/${companyId}/apps/${appId}/enable`);
    return this.appService.enableApp(companyId, appId, userId);
  }

  @Post(':appId/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable an app for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'appId', description: 'App ID' })
  @ApiResponse({ status: 200, type: ToggleAppResponseDto })
  async disable(
    @Param('companyId') companyId: string,
    @Param('appId') appId: string,
    @UserId() userId: string,
  ): Promise<ToggleAppResponseDto> {
    this.logger.log(`POST /companies/${companyId}/apps/${appId}/disable`);
    return this.appService.disableApp(companyId, appId, userId);
  }
}

/**
 * Public controller for app catalog (no auth required)
 */
@ApiTags('Apps')
@Controller('apps')
export class AppCatalogController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all available apps (public catalog)' })
  @ApiResponse({ status: 200, type: [AppResponseDto] })
  async findAll(): Promise<AppResponseDto[]> {
    return this.appService.findAll();
  }

  @Get(':appId')
  @Public()
  @ApiOperation({ summary: 'Get app details' })
  @ApiParam({ name: 'appId', description: 'App ID' })
  @ApiResponse({ status: 200, type: AppResponseDto })
  async findById(@Param('appId') appId: string): Promise<AppResponseDto> {
    return this.appService.findById(appId);
  }
}
