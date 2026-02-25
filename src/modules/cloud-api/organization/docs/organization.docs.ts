import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrganizationDto } from '../dto/request/create-organization.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { OrgListItemDto } from '../dto/entity/organization.dto';

export function ApiCreateOrganization() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new organization', description: 'Creates an organization and adds the authenticated user as Owner.' }),
    ApiBody({ type: CreateOrganizationDto }),
    ApiResponse({ status: 201, description: 'Organization created successfully.', type: CreateOrganizationResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Subdomain or identifier already taken.' }),
  );
}

export function ApiGetMyOrgs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get my organizations', description: "Returns all organizations the authenticated user is a member of." }),
    ApiResponse({ status: 200, description: 'List of organizations retrieved successfully.', type: OrgListItemDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
