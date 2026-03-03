import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';

export function ApiUpsertTableState() {
  return applyDecorators(
    ApiOperation({
      summary: 'Save live table state',
      description:
        'Stores the current filter, sort, and column visibility state in Redis cache. Called on filter Apply and sort column click. State expires after TABLE_STATE_CACHE_TTL seconds.',
    }),
    ApiBody({ type: UpsertTableStateDto }),
    ApiResponse({ status: 200, description: 'Live state cached.' }),
    ApiResponse({ status: 400, description: 'Invalid request body.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
