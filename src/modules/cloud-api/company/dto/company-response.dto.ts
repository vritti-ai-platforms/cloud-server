import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Company, Tenant } from '@/db/schema';
import type { RoleResponseDto } from '../../role/dto';

export class TenantSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  subdomain: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  dbType: string;

  @ApiProperty()
  status: string;

  constructor(partial: Partial<TenantSummaryDto>) {
    Object.assign(this, partial);
  }

  static from(tenant: { id: string; subdomain: string; name: string; dbType: string; status: string }): TenantSummaryDto {
    return new TenantSummaryDto({
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      dbType: tenant.dbType,
      status: tenant.status,
    });
  }
}

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  industry: string;

  @ApiProperty()
  size: string;

  @ApiPropertyOptional()
  logoUrl: string | null;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  dbRegion: string | null;

  @ApiProperty()
  dbHealth: string;

  @ApiProperty()
  usersCount: number;

  @ApiProperty()
  businessUnitsCount: number;

  @ApiProperty()
  enabledAppsCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: TenantSummaryDto })
  tenant?: TenantSummaryDto;

  constructor(partial: Partial<CompanyResponseDto>) {
    Object.assign(this, partial);
  }

  static from(company: Company, tenant?: { id: string; subdomain: string; name: string; dbType: string; status: string }): CompanyResponseDto {
    return new CompanyResponseDto({
      id: company.id,
      tenantId: company.tenantId,
      industry: company.industry,
      size: company.size,
      logoUrl: company.logoUrl,
      timezone: company.timezone,
      currency: company.currency,
      dbRegion: company.dbRegion,
      dbHealth: company.dbHealth,
      usersCount: company.usersCount,
      businessUnitsCount: company.businessUnitsCount,
      enabledAppsCount: company.enabledAppsCount,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      tenant: tenant ? TenantSummaryDto.from(tenant) : undefined,
    });
  }
}

export class CompanyMemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  invitedBy: string | null;

  @ApiProperty({ description: 'Roles assigned to this member', type: [String] })
  roleIds: string[];

  @ApiProperty()
  createdAt: Date;

  constructor(partial: Partial<CompanyMemberResponseDto>) {
    Object.assign(this, partial);
  }
}

export class CreateCompanyResponseDto {
  @ApiProperty({ type: CompanyResponseDto })
  company: CompanyResponseDto;

  @ApiProperty({ type: TenantSummaryDto })
  tenant: TenantSummaryDto;

  @ApiProperty({ description: 'Default roles created for the company' })
  defaultRoles: RoleResponseDto[];

  @ApiProperty({ description: 'Creator membership details' })
  membership: CompanyMemberResponseDto;

  constructor(partial: Partial<CreateCompanyResponseDto>) {
    Object.assign(this, partial);
  }
}
