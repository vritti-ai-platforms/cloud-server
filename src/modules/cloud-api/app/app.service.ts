import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException, ConflictException } from '@vritti/api-sdk';
import { AppRepository } from './app.repository';
import { AppResponseDto, ToggleAppResponseDto } from './dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CompanyRepository } from '../company/company.repository';
import { CompanyMemberRepository } from '../company/company-member.repository';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly appRepository: AppRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly companyMemberRepository: CompanyMemberRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Get all available apps
   */
  async findAll(): Promise<AppResponseDto[]> {
    const apps = await this.appRepository.findAllApps();
    return apps.map((app) => AppResponseDto.from(app));
  }

  /**
   * Get all apps with enabled status for a company
   */
  async findAllForCompany(companyId: string): Promise<AppResponseDto[]> {
    const appsWithStatus = await this.appRepository.findAllAppsWithStatus(companyId);
    return appsWithStatus.map(({ app, companyApp }) => AppResponseDto.from(app, companyApp));
  }

  /**
   * Get a single app by ID
   */
  async findById(appId: string): Promise<AppResponseDto> {
    const app = await this.appRepository.findAppById(appId);
    if (!app) {
      throw new NotFoundException(`App with ID '${appId}' not found`, 'The app may have been removed.');
    }
    return AppResponseDto.from(app);
  }

  /**
   * Enable an app for a company
   */
  async enableApp(companyId: string, appId: string, userId?: string): Promise<ToggleAppResponseDto> {
    // Verify app exists
    const app = await this.appRepository.findAppById(appId);
    if (!app) {
      throw new NotFoundException(`App with ID '${appId}' not found`, 'The app may have been removed.');
    }

    // Check if already enabled
    const existingCompanyApp = await this.appRepository.findCompanyApp(companyId, appId);
    if (existingCompanyApp?.status === 'ACTIVE') {
      throw new ConflictException(
        'appId',
        `App '${app.name}' is already enabled for this company`,
        'The app is already active.',
      );
    }

    // Get the company member ID for the user (enabledBy references companyMembers.id, not user.id)
    let companyMemberId: string | undefined;
    if (userId) {
      const companyMember = await this.companyMemberRepository.findByCompanyAndUser(companyId, userId);
      companyMemberId = companyMember?.id;
    }

    // Enable or re-enable the app
    if (existingCompanyApp) {
      // Re-enable existing inactive record
      await this.appRepository.reEnableApp(companyId, appId, companyMemberId);
    } else {
      // Create new company app record
      await this.appRepository.enableApp(companyId, appId, companyMemberId);
    }

    // Update company's enabled apps count
    await this.companyRepository.incrementEnabledAppsCount(companyId);

    // Log activity
    await this.activityLogService.log({
      companyId,
      userId,
      action: 'app.enabled',
      entityType: 'app',
      entityId: appId,
      metadata: { appName: app.name, appSlug: app.slug },
    });

    this.logger.log(`Enabled app '${app.name}' for company ${companyId}`);

    return {
      appId,
      companyId,
      enabled: true,
      message: `App '${app.name}' has been enabled`,
    };
  }

  /**
   * Disable an app for a company
   */
  async disableApp(companyId: string, appId: string, userId?: string): Promise<ToggleAppResponseDto> {
    // Verify app exists
    const app = await this.appRepository.findAppById(appId);
    if (!app) {
      throw new NotFoundException(`App with ID '${appId}' not found`, 'The app may have been removed.');
    }

    // Check if app is enabled
    const existingCompanyApp = await this.appRepository.findCompanyApp(companyId, appId);
    if (!existingCompanyApp || existingCompanyApp.status !== 'ACTIVE') {
      throw new ConflictException(
        'appId',
        `App '${app.name}' is not enabled for this company`,
        'The app is already disabled or was never enabled.',
      );
    }

    // Disable the app
    await this.appRepository.disableApp(companyId, appId);

    // Update company's enabled apps count
    await this.companyRepository.decrementEnabledAppsCount(companyId);

    // Log activity
    await this.activityLogService.log({
      companyId,
      userId,
      action: 'app.disabled',
      entityType: 'app',
      entityId: appId,
      metadata: { appName: app.name, appSlug: app.slug },
    });

    this.logger.log(`Disabled app '${app.name}' for company ${companyId}`);

    return {
      appId,
      companyId,
      enabled: false,
      message: `App '${app.name}' has been disabled`,
    };
  }
}
