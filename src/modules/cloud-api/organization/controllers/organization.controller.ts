import { Controller, Get, HttpCode, HttpStatus, Logger, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import type { FastifyRequest } from 'fastify';
import { ApiCheckSubdomain, ApiCreateOrganization, ApiGetMyOrgs } from '../docs/organization.docs';
import { CheckSubdomainDto } from '../dto/request/check-subdomain.dto';
import { GetMyOrgsDto } from '../dto/request/get-my-orgs.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { PaginatedOrgsResponseDto } from '../dto/response/paginated-orgs-response.dto';
import { SubdomainAvailabilityResponseDto } from '../dto/response/subdomain-availability-response.dto';
import { OrganizationService } from '../services/organization.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  // Checks whether a subdomain is available for use
  @Get('check-subdomain')
  @ApiCheckSubdomain()
  async checkSubdomain(@Query() dto: CheckSubdomainDto): Promise<SubdomainAvailabilityResponseDto> {
    this.logger.log(`GET /organizations/check-subdomain - subdomain: ${dto.subdomain}`);
    return this.organizationService.checkSubdomainAvailable(dto.subdomain);
  }

  // Creates a new organization with the authenticated user as Owner
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateOrganization()
  async create(@UserId() userId: string, @Req() request: FastifyRequest): Promise<CreateOrganizationResponseDto> {
    this.logger.log(`POST /organizations - Creating organization for user: ${userId}`);
    return this.organizationService.create(userId, request);
  }

  // Returns all organizations that the authenticated user is a member of
  @Get('me')
  @ApiGetMyOrgs()
  async getMyOrgs(@UserId() userId: string, @Query() dto: GetMyOrgsDto): Promise<PaginatedOrgsResponseDto> {
    this.logger.log(`GET /organizations/me - Fetching organizations for user: ${userId}`);
    return this.organizationService.getMyOrgs(userId, dto);
  }
}
