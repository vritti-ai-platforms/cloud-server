import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IndustryDto } from '../dto/entity/industry.dto';
import { IndustrySelectResponseDto } from '../dto/response/industry-select-response.dto';

export function ApiGetIndustries() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all industries', description: 'Returns a list of all available industry types.' }),
    ApiResponse({ status: 200, description: 'Industries retrieved successfully.', type: IndustryDto, isArray: true }),
  );
}

export function ApiGetIndustriesSelect() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get industries for select component',
      description: 'Returns paginated industry options for quantum-ui Select.',
    }),
    ApiResponse({ status: 200, description: 'Industry options retrieved.', type: IndustrySelectResponseDto }),
  );
}
