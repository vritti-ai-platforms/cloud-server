import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IndustryDto } from '../dto/entity/industry.dto';

export function ApiGetIndustries() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all industries', description: 'Returns a list of all available industry types.' }),
    ApiResponse({ status: 200, description: 'Industries retrieved successfully.', type: IndustryDto, isArray: true }),
  );
}
