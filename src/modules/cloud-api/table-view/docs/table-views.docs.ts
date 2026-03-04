import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TableViewDto } from '../dto/entity/table-view.dto';
import { CreateTableViewDto } from '../dto/request/create-table-view.dto';
import { RenameTableViewDto } from '../dto/request/rename-table-view.dto';
import { ToggleShareTableViewDto } from '../dto/request/toggle-share-table-view.dto';
import { UpdateTableViewDto } from '../dto/request/update-table-view.dto';

export function ApiListTableViews() {
  return applyDecorators(
    ApiOperation({
      summary: 'List named table views',
      description: "Returns the authenticated user's own named views plus all shared views for the given table slug.",
    }),
    ApiQuery({
      name: 'tableSlug',
      description: 'Slug of the table to fetch views for',
      example: 'cloud-providers',
      required: true,
    }),
    ApiResponse({ status: 200, description: 'Named views retrieved.', type: [TableViewDto] }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiCreateTableView() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create named table view',
      description: 'Saves the current table state as a named view snapshot. The name must be unique per user+table.',
    }),
    ApiBody({ type: CreateTableViewDto }),
    ApiResponse({ status: 201, description: 'Named view created.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'Invalid request body.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiUpdateTableView() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update named table view',
      description: 'Updates the name, state, or sharing status of an existing named view. Only the owner can update.',
    }),
    ApiParam({ name: 'id', description: 'UUID of the table view to update' }),
    ApiBody({ type: UpdateTableViewDto }),
    ApiResponse({ status: 200, description: 'View updated.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'Validation failed or view is the live state row.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'View not found.' }),
  );
}

export function ApiRenameTableView() {
  return applyDecorators(
    ApiOperation({
      summary: 'Rename a named table view',
      description: 'Updates the display name of an existing view. The new name must be unique per user+table. Only the owner can rename.',
    }),
    ApiParam({ name: 'id', description: 'UUID of the table view to rename' }),
    ApiBody({ type: RenameTableViewDto }),
    ApiResponse({ status: 200, description: 'View renamed.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'Not owned by caller.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'View not found.' }),
    ApiResponse({ status: 409, description: 'A view with this name already exists.' }),
  );
}

export function ApiToggleShareTableView() {
  return applyDecorators(
    ApiOperation({
      summary: 'Toggle view sharing',
      description: 'Makes a view visible to all users (shared) or restricts it to the owner only (private). Only the owner can toggle sharing.',
    }),
    ApiParam({ name: 'id', description: 'UUID of the table view' }),
    ApiBody({ type: ToggleShareTableViewDto }),
    ApiResponse({ status: 200, description: 'Sharing status updated.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'Not owned by caller.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'View not found.' }),
  );
}

export function ApiDeleteTableView() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete named table view',
      description: 'Permanently deletes a named view. Only the owner can delete their own views.',
    }),
    ApiParam({ name: 'id', description: 'UUID of the table view to delete' }),
    ApiResponse({ status: 200, description: 'View deleted.', type: TableViewDto }),
    ApiResponse({ status: 400, description: 'View is the live state row or not owned by caller.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'View not found.' }),
  );
}
