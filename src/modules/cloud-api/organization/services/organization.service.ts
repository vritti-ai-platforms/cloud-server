import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException } from '@vritti/api-sdk';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { OrgMemberRoleValues } from '@/db/schema';
import { MediaService } from '../../media/services/media.service';
import { OrgListItemDto } from '../dto/entity/organization.dto';
import { CreateOrganizationDto } from '../dto/request/create-organization.dto';
import type { GetMyOrgsDto } from '../dto/request/get-my-orgs.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { PaginatedOrgsResponseDto } from '../dto/response/paginated-orgs-response.dto';
import { SubdomainAvailabilityResponseDto } from '../dto/response/subdomain-availability-response.dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly orgRepository: OrganizationRepository,
    private readonly orgMemberRepository: OrganizationMemberRepository,
    private readonly mediaService: MediaService,
  ) {}

  // Checks if a subdomain is available; throws ConflictException if already taken
  async checkSubdomainAvailable(subdomain: string): Promise<SubdomainAvailabilityResponseDto> {
    const existing = await this.orgRepository.findBySubdomain(subdomain);
    if (existing) {
      throw new ConflictException({
        label: 'Subdomain Taken',
        detail: 'This subdomain is already in use. Please choose a different one.',
        errors: [{ field: 'subdomain', message: 'Already taken' }],
      });
    }
    return { available: true };
  }

  // Creates a new organization with optional logo upload and adds the requesting user as Owner
  async create(userId: string, request: FastifyRequest): Promise<CreateOrganizationResponseDto> {
    const { dto, file } = await this.parseMultipartRequest(request);

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

    if (file) {
      const media = await this.mediaService.upload(file, userId, {
        entityType: 'organization',
        entityId: org.id,
      });
      await this.orgRepository.update(org.id, { mediaId: media.id });
      org.mediaId = media.id;
    }

    this.logger.log(`Created organization: ${org.subdomain} (${org.id}) for user: ${userId}`);

    return { ...OrgListItemDto.from(org, OrgMemberRoleValues.Owner), message: 'Organization created successfully' };
  }

  // Returns paginated organizations for the authenticated user
  async getMyOrgs(userId: string, dto: GetMyOrgsDto): Promise<PaginatedOrgsResponseDto> {
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    const { result: members, count } = await this.orgMemberRepository.findByUserId(userId, { limit, offset });
    return {
      result: members.map((m) => OrgListItemDto.from(m.organization, m.role)),
      total: count,
      offset,
      limit,
      hasMore: offset + limit < count,
    };
  }

  // Parses multipart form data into DTO fields and optional file
  private async parseMultipartRequest(request: FastifyRequest): Promise<{
    dto: CreateOrganizationDto;
    file?: { buffer: Buffer; filename: string; mimetype: string };
  }> {
    const parts = request.parts();
    const fields: Record<string, unknown> = {};
    let file: { buffer: Buffer; filename: string; mimetype: string } | undefined;

    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        file = { buffer, filename: part.filename, mimetype: part.mimetype };
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    // Convert numeric string fields
    if (fields.industryId) {
      fields.industryId = Number(fields.industryId);
    }

    const dto = await this.validateDto(fields);
    return { dto, file };
  }

  // Validates raw fields against CreateOrganizationDto using class-validator
  private async validateDto(fields: Record<string, unknown>): Promise<CreateOrganizationDto> {
    const dto = plainToInstance(CreateOrganizationDto, fields);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const fieldErrors = errors.map((e) => ({
        field: e.property,
        message: Object.values(e.constraints ?? {})[0] ?? 'Invalid value',
      }));
      throw new BadRequestException({
        label: 'Validation Failed',
        detail: 'One or more fields are invalid.',
        errors: fieldErrors,
      });
    }

    return dto;
  }
}
