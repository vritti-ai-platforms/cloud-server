import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import { ApiUpsertTableState } from '../docs/table-states.docs';
import { TableViewDto } from '../dto/entity/table-view.dto';
import { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';
import { TableViewService } from '../services/table-view.service';

@ApiTags('Table States')
@ApiBearerAuth()
@Controller('table-states')
export class TableStatesController {
  private readonly logger = new Logger(TableStatesController.name);

  constructor(private readonly tableViewService: TableViewService) {}

  // Upserts the auto-saved live state for the authenticated user's table
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiUpsertTableState()
  upsertCurrentState(@UserId() userId: string, @Body() dto: UpsertTableStateDto): Promise<TableViewDto> {
    this.logger.log(`POST /table-states - User: ${userId}, table: ${dto.tableSlug}`);
    return this.tableViewService.upsertCurrentState(userId, dto);
  }
}
