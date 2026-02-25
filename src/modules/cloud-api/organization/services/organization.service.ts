import { Injectable, Logger } from '@nestjs/common';
import { ConflictException } from '@vritti/api-sdk';
import { OrgMemberRoleValues } from '@/db/schema';
import { OrgListItemDto } from '../dto/entity/organization.dto';
import type { CreateOrganizationDto } from '../dto/request/create-organization.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository';
import { OrganizationRepository } from '../repositories/organization.repository';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly orgRepository: OrganizationRepository,
    private readonly orgMemberRepository: OrganizationMemberRepository,
  ) {}

  // Creates a new organization and adds the requesting user as Owner
  async create(userId: string, dto: CreateOrganizationDto): Promise<CreateOrganizationResponseDto> {
    const existingSubdomain = await this.orgRepository.findBySubdomain(dto.subdomain);
    if (existingSubdomain) {
      throw new ConflictException({
        label: 'Subdomain Taken',
        detail: 'This subdomain is already in use. Please choose a different one.',
        errors: [{ field: 'subdomain', message: 'Already taken' }],
      });
    }

    const existingIdentifier = await this.orgRepository.findByOrgIdentifier(dto.orgIdentifier);
    if (existingIdentifier) {
      throw new ConflictException({
        label: 'Identifier Taken',
        detail: 'This identifier is already in use.',
        errors: [{ field: 'orgIdentifier', message: 'Already taken' }],
      });
    }

    const org = await this.orgRepository.create({ ...dto, plan: dto.plan ?? 'free' });

    await this.orgMemberRepository.create({
      organizationId: org.id,
      userId,
      role: OrgMemberRoleValues.Owner,
    });

    this.logger.log(`Created organization: ${org.subdomain} (${org.id}) for user: ${userId}`);

    return { ...OrgListItemDto.from(org, OrgMemberRoleValues.Owner), message: 'Organization created successfully' };
  }

  // Returns all organizations that the authenticated user belongs to
  async getMyOrgs(userId: string): Promise<OrgListItemDto[]> {
    const memberships = await this.orgMemberRepository.findByUserId(userId);
    return memberships.map((m) => OrgListItemDto.from(m.organization, m.role));
  }
}
