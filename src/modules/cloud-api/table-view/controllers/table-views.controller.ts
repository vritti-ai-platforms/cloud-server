import { Body, Controller, Delete, HttpCode, HttpStatus, Get, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { ApiCreateTableView, ApiDeleteTableView, ApiListTableViews, ApiUpdateTableView } from '../docs/table-views.docs';
import { TableViewDto } from '../dto/entity/table-view.dto';
import { CreateTableViewDto } from '../dto/request/create-table-view.dto';
import { UpdateTableViewDto } from '../dto/request/update-table-view.dto';
import { TableViewService } from '../services/table-view.service';

@ApiTags('Table Views')
@ApiBearerAuth()
@Controller('table-views')
export class TableViewsController {
  private readonly logger = new Logger(TableViewsController.name);

  constructor(private readonly tableViewService: TableViewService) {}

  // Returns all named views for the given table — own plus shared
  @Get()
  @ApiListTableViews()
  findViews(@UserId() userId: string, @Query('tableSlug') tableSlug: string): Promise<TableViewDto[]> {
    this.logger.log(`GET /table-views?tableSlug=${tableSlug} - User: ${userId}`);
    return this.tableViewService.findViews(userId, tableSlug);
  }

  // Creates a named snapshot of the current table state
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTableView()
  createView(@UserId() userId: string, @Body() dto: CreateTableViewDto): Promise<TableViewDto> {
    this.logger.log(`POST /table-views - User: ${userId}, table: ${dto.tableSlug}`);
    return this.tableViewService.createView(userId, dto);
  }

  // Updates name, state, or sharing flag of an existing named view
  @Patch(':id')
  @ApiUpdateTableView()
  updateView(@UserId() userId: string, @Param('id') id: string, @Body() dto: UpdateTableViewDto): Promise<TableViewDto> {
    this.logger.log(`PATCH /table-views/${id} - User: ${userId}`);
    return this.tableViewService.updateView(userId, id, dto);
  }

  // Deletes a named view owned by the authenticated user
  @Delete(':id')
  @ApiDeleteTableView()
  deleteView(@UserId() userId: string, @Param('id') id: string): Promise<TableViewDto> {
    this.logger.log(`DELETE /table-views/${id} - User: ${userId}`);
    return this.tableViewService.deleteView(userId, id);
  }
}
