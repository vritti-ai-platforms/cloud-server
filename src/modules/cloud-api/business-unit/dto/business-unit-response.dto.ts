import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BusinessUnit } from '@/db/schema';

export class BusinessUnitResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  code: string | null;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  addressLine1: string | null;

  @ApiPropertyOptional()
  addressLine2: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  state: string | null;

  @ApiPropertyOptional()
  postalCode: string | null;

  @ApiPropertyOptional()
  country: string | null;

  @ApiPropertyOptional()
  managerId: string | null;

  @ApiProperty()
  employeesCount: number;

  @ApiProperty()
  enabledAppsCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<BusinessUnitResponseDto>) {
    Object.assign(this, partial);
  }

  static from(bu: BusinessUnit): BusinessUnitResponseDto {
    return new BusinessUnitResponseDto({
      id: bu.id,
      companyId: bu.companyId,
      name: bu.name,
      code: bu.code,
      type: bu.type,
      description: bu.description,
      status: bu.status,
      phone: bu.phone,
      email: bu.email,
      addressLine1: bu.addressLine1,
      addressLine2: bu.addressLine2,
      city: bu.city,
      state: bu.state,
      postalCode: bu.postalCode,
      country: bu.country,
      managerId: bu.managerId,
      employeesCount: bu.employeesCount,
      enabledAppsCount: bu.enabledAppsCount,
      createdAt: bu.createdAt,
      updatedAt: bu.updatedAt,
    });
  }
}
