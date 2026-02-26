import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateOrganizationDto } from '../dto/request/create-organization.dto';
import { CreateOrganizationResponseDto } from '../dto/response/create-organization-response.dto';
import { PaginatedOrgsResponseDto } from '../dto/response/paginated-orgs-response.dto';
import { SubdomainAvailabilityResponseDto } from '../dto/response/subdomain-availability-response.dto';

export function ApiCheckSubdomain() {
  return applyDecorators(
    ApiOperation({ summary: 'Check subdomain availability' }),
    ApiQuery({ name: 'subdomain', type: String }),
    ApiResponse({ status: 200, description: 'Subdomain availability result.', type: SubdomainAvailabilityResponseDto }),
    ApiResponse({ status: 409, description: 'Subdomain already taken.' }),
  );
}

export function ApiCreateOrganization() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new organization',
      description: 'Creates an organization and adds the authenticated user as Owner.',
    }),
    ApiBody({ type: CreateOrganizationDto }),
    ApiResponse({
      status: 201,
      description: 'Organization created successfully.',
      type: CreateOrganizationResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Subdomain or identifier already taken.' }),
  );
}

export function ApiGetMyOrgs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get my organizations',
      description: 'Returns paginated organizations the authenticated user is a member of.',
    }),
    ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip (default: 0)' }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of organizations retrieved successfully.',
      type: PaginatedOrgsResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
