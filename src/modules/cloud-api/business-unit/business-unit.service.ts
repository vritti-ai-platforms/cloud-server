import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '@vritti/api-sdk';
import { BusinessUnitRepository } from './business-unit.repository';
import { CompanyRepository } from '../company/company.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateBusinessUnitDto, BusinessUnitResponseDto } from './dto';
import type { BusinessUnit } from '@/db/schema';

@Injectable()
export class BusinessUnitService {
  private readonly logger = new Logger(BusinessUnitService.name);

  constructor(
    private readonly businessUnitRepository: BusinessUnitRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(
    companyId: string,
    dto: CreateBusinessUnitDto,
    actorUserId?: string,
  ): Promise<BusinessUnitResponseDto> {
    const bu = await this.businessUnitRepository.create({
      companyId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      description: dto.description,
      phone: dto.phone,
      email: dto.email,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      managerId: dto.managerId,
    });

    // Update company count
    await this.companyRepository.incrementBusinessUnitsCount(companyId);

    // Log activity
    await this.activityLogService.log({
      companyId,
      userId: actorUserId,
      action: 'business_unit.created',
      entityType: 'business_unit',
      entityId: bu.id,
      metadata: { name: bu.name, type: bu.type },
    });

    this.logger.log(`Created business unit '${bu.name}' in company ${companyId}`);
    return BusinessUnitResponseDto.from(bu);
  }

  async findByCompanyId(companyId: string): Promise<BusinessUnitResponseDto[]> {
    const units = await this.businessUnitRepository.findByCompanyId(companyId);
    return units.map((bu) => BusinessUnitResponseDto.from(bu));
  }

  async findById(id: string): Promise<BusinessUnitResponseDto> {
    const bu = await this.businessUnitRepository.findById(id);
    if (!bu) {
      throw new NotFoundException(
        `Business unit with ID '${id}' not found`,
        'The business unit may have been deleted.',
      );
    }
    return BusinessUnitResponseDto.from(bu);
  }

  async update(
    id: string,
    dto: Partial<CreateBusinessUnitDto>,
    actorUserId?: string,
  ): Promise<BusinessUnitResponseDto> {
    const existing = await this.businessUnitRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `Business unit with ID '${id}' not found`,
        'The business unit may have been deleted.',
      );
    }

    const bu = await this.businessUnitRepository.update(id, dto as Partial<BusinessUnit>);

    // Log activity
    await this.activityLogService.log({
      companyId: existing.companyId,
      userId: actorUserId,
      action: 'business_unit.updated',
      entityType: 'business_unit',
      entityId: id,
      changes: dto as Record<string, unknown>,
    });

    this.logger.log(`Updated business unit ${id}`);
    return BusinessUnitResponseDto.from(bu);
  }

  async delete(id: string, actorUserId?: string): Promise<void> {
    const existing = await this.businessUnitRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `Business unit with ID '${id}' not found`,
        'The business unit may have already been deleted.',
      );
    }

    await this.businessUnitRepository.delete(id);

    // Update company count
    await this.companyRepository.decrementBusinessUnitsCount(existing.companyId);

    // Log activity
    await this.activityLogService.log({
      companyId: existing.companyId,
      userId: actorUserId,
      action: 'business_unit.deleted',
      entityType: 'business_unit',
      entityId: id,
      metadata: { name: existing.name },
    });

    this.logger.log(`Deleted business unit ${id}`);
  }
}
