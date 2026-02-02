import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { CompanyRepository } from './company.repository';
import { CompanyMemberService } from './company-member.service';
import { TenantService } from '../tenant/tenant.service';
import { RoleService } from '../role/role.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CreateCompanyResponseDto,
  TenantSummaryDto,
} from './dto';
import type { Company } from '@/db/schema';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly companyMemberService: CompanyMemberService,
    private readonly tenantService: TenantService,
    private readonly roleService: RoleService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(userId: string, dto: CreateCompanyDto): Promise<CreateCompanyResponseDto> {
    // Validate DEDICATED db type requires region
    if (dto.dbType === 'DEDICATED' && !dto.dbRegion) {
      throw new BadRequestException(
        'dbRegion',
        'Database region is required for DEDICATED database type',
        'Please select a database region.',
      );
    }

    // 1. Create tenant
    // For SHARED db type, auto-generate schema name from subdomain (replace hyphens with underscores)
    const dbSchema = dto.dbType === 'SHARED' ? dto.subdomain.replace(/-/g, '_') : undefined;

    const tenant = await this.tenantService.create({
      subdomain: dto.subdomain,
      name: dto.name,
      dbType: dto.dbType,
      dbSchema,
    });

    // 2. Create company
    const company = await this.companyRepository.create({
      tenantId: tenant.id,
      industry: dto.industry,
      size: dto.size,
      logoUrl: dto.logoUrl,
      dbRegion: dto.dbRegion,
    });

    // 3. Create default roles
    const defaultRoles = await this.roleService.createDefaultRoles(company.id);

    // 4. Find Owner role
    const ownerRole = defaultRoles.find((r) => r.name === 'Owner');
    if (!ownerRole) {
      throw new Error('Owner role not created');
    }

    // 5. Add creator as company member with Owner role
    const membership = await this.companyMemberService.addMember({
      companyId: company.id,
      userId,
      roleIds: [ownerRole.id],
    });

    // 6. TODO: Enable selected apps (if provided)
    // if (dto.enabledAppIds?.length) {
    //   await this.appService.enableApps(company.id, dto.enabledAppIds, membership.id);
    // }

    // 7. Log activity
    await this.activityLogService.log({
      companyId: company.id,
      userId,
      action: 'company.created',
      entityType: 'company',
      entityId: company.id,
      metadata: {
        name: dto.name,
        subdomain: dto.subdomain,
        industry: dto.industry,
      },
    });

    this.logger.log(`Created company '${dto.name}' with subdomain '${dto.subdomain}'`);

    return new CreateCompanyResponseDto({
      company: CompanyResponseDto.from(company, tenant),
      tenant: TenantSummaryDto.from(tenant),
      defaultRoles,
      membership,
    });
  }

  async findById(id: string): Promise<CompanyResponseDto> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException(
        `Company with ID '${id}' not found`,
        'The company may have been deleted.',
      );
    }

    const tenant = await this.tenantService.findById(company.tenantId);
    return CompanyResponseDto.from(company, tenant);
  }

  async findByUserId(userId: string): Promise<CompanyResponseDto[]> {
    const memberships = await this.companyMemberService.findByUserId(userId);

    const companies = await Promise.all(
      memberships.map(async (membership) => {
        const company = await this.companyRepository.findById(membership.companyId);
        if (!company) return null;

        const tenant = await this.tenantService.findById(company.tenantId);
        return CompanyResponseDto.from(company, tenant);
      }),
    );

    return companies.filter((c): c is CompanyResponseDto => c !== null);
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    actorUserId?: string,
  ): Promise<CompanyResponseDto> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `Company with ID '${id}' not found`,
        'The company may have been deleted.',
      );
    }

    const updateData: Partial<Company> = {};
    if (dto.industry) updateData.industry = dto.industry;
    if (dto.size) updateData.size = dto.size;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.timezone) updateData.timezone = dto.timezone;
    if (dto.currency) updateData.currency = dto.currency;

    const company = await this.companyRepository.update(id, updateData);

    // Log activity
    await this.activityLogService.log({
      companyId: id,
      userId: actorUserId,
      action: 'company.updated',
      entityType: 'company',
      entityId: id,
      changes: dto as Record<string, unknown>,
    });

    const tenant = await this.tenantService.findById(company.tenantId);
    this.logger.log(`Updated company ${id}`);

    return CompanyResponseDto.from(company, tenant);
  }

  async delete(id: string, actorUserId?: string): Promise<void> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `Company with ID '${id}' not found`,
        'The company may have already been deleted.',
      );
    }

    // Archive tenant (which cascades to company)
    await this.tenantService.archive(existing.tenantId);

    // Log activity
    await this.activityLogService.log({
      companyId: id,
      userId: actorUserId,
      action: 'company.deleted',
      entityType: 'company',
      entityId: id,
    });

    this.logger.log(`Deleted company ${id}`);
  }

  async getActivity(companyId: string, limit = 50, offset = 0) {
    return this.activityLogService.getCompanyActivity(companyId, limit, offset);
  }
}
