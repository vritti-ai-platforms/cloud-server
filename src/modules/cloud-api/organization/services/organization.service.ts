import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException } from '@vritti/api-sdk';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { OrgMemberRoleValues } from '@/db/schema';
import { DeploymentRepository } from '@/modules/admin-api/deployment/repositories/deployment.repository';
import { NexusApiService } from '@/services/nexus-api.service';
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
    private readonly nexusApiService: NexusApiService,
    private readonly deploymentRepository: DeploymentRepository,
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
    await this.checkSubdomainAvailable(dto.subdomain);

    // // Look up deployment for nexus URL and webhook secret
    // if (!dto.deploymentId) {
    //   throw new BadRequestException({
    //     label: 'Deployment Required',
    //     detail: 'A deployment must be specified to create an organization.',
    //     errors: [{ field: 'deploymentId', message: 'Required' }],
    //   });
    // }

    const deployment = await this.deploymentRepository.findById('41fd755d-209e-4b22-a652-91f2e2720b96');
    if (!deployment) {
      throw new BadRequestException({
        label: 'Invalid Deployment',
        detail: 'The specified deployment does not exist.',
        errors: [{ field: 'deploymentId', message: 'Not found' }],
      });
    }

    // Create the organization in api-nexus first to get the nexus org ID
    const nexusOrg = await this.nexusApiService.createOrganization(deployment.nexusUrl, deployment.webhookSecret, {
      name: dto.name,
      subdomain: dto.subdomain,
      size: dto.size,
      planId: dto.planId,
      mediaId: dto.mediaId,
    });

    const org = await this.orgRepository.create({
      ...dto,
      orgIdentifier: nexusOrg.id,
    });

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

    this.logger.log(
      `Created organization: ${org.subdomain} (${org.id}) with nexus ID: ${nexusOrg.id} for user: ${userId}`,
    );

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
