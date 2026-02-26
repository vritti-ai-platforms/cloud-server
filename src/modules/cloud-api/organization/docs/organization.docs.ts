import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
      description:
        'Creates an organization and adds the authenticated user as Owner. Accepts multipart/form-data with optional file upload for organization logo.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['name', 'subdomain', 'orgIdentifier', 'size'],
        properties: {
          name: { type: 'string', example: 'Acme Corp' },
          subdomain: { type: 'string', example: 'acme-corp', pattern: '^[a-z0-9-]+$' },
          orgIdentifier: { type: 'string', example: 'acme' },
          size: {
            type: 'string',
            enum: ['0-10', '10-20', '20-50', '50-100', '100-500', '500+'],
            example: '0-10',
          },
          plan: { type: 'string', enum: ['free', 'pro', 'enterprise'], example: 'free' },
          industryId: { type: 'integer', example: 1 },
          file: { type: 'string', format: 'binary', description: 'Optional logo file' },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Organization created successfully.',
      type: CreateOrganizationResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Subdomain already taken.' }),
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
