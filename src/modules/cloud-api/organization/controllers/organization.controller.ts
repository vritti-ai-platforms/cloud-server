import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { ApiCreateOrganization, ApiGetMyOrgs } from '../docs/organization.docs';
import { OrgListItemDto } from '../dto/entity/organization.dto';
import { CreateOrganizationDto } from '../dto/request/create-organization.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { OrganizationService } from '../services/organization.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  // Creates a new organization with the authenticated user as Owner
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateOrganization()
  async create(@UserId() userId: string, @Body() dto: CreateOrganizationDto): Promise<CreateOrganizationResponseDto> {
    this.logger.log(`POST /organizations - Creating organization for user: ${userId}`);
    return this.organizationService.create(userId, dto);
  }

  // Returns all organizations that the authenticated user is a member of
  @Get('me')
  @ApiGetMyOrgs()
  async getMyOrgs(@UserId() userId: string): Promise<OrgListItemDto[]> {
    this.logger.log(`GET /organizations/me - Fetching organizations for user: ${userId}`);
    return this.organizationService.getMyOrgs(userId);
  }
}
