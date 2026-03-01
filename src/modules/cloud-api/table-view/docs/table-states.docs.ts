import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TableViewDto } from '../dto/entity/table-view.dto';
import { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';

export function ApiUpsertTableState() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upsert live table state',
      description:
        'Saves the current filter, sort, and column visibility state for a table. Creates a new row on first call; updates existing on subsequent calls. Called on filter Apply and on sort column click.',
    }),
    ApiBody({ type: UpsertTableStateDto }),
    ApiResponse({ status: 200, description: 'Live state saved.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'Invalid request body.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
