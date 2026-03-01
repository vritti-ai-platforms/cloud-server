import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, type TableViewState } from '@vritti/api-sdk';
import type { CreateTableViewDto } from '../dto/request/create-table-view.dto';
import type { UpdateTableViewDto } from '../dto/request/update-table-view.dto';
import type { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';
import { TableViewDto } from '../dto/entity/table-view.dto';
import { TableViewRepository } from '../repositories/table-view.repository';

const EMPTY_TABLE_STATE: TableViewState = {
  filters: [],
  sort: [],
  columnVisibility: {},
};

@Injectable()
export class TableViewService {
  private readonly logger = new Logger(TableViewService.name);

  constructor(private readonly tableViewRepository: TableViewRepository) {}

  // Upserts the auto-saved live state for a user+table; updates if exists, inserts if not
  async upsertCurrentState(userId: string, dto: UpsertTableStateDto): Promise<TableViewDto> {
    const existing = await this.tableViewRepository.findCurrentByUserAndSlug(userId, dto.tableSlug);

    if (existing) {
      const updated = await this.tableViewRepository.update(existing.id, { state: dto.state });
      this.logger.log(`Updated live state for user: ${userId}, table: ${dto.tableSlug}`);
      return TableViewDto.from(updated, userId);
    }

    const created = await this.tableViewRepository.create({
      userId,
      tableSlug: dto.tableSlug,
      name: null,
      state: dto.state,
      isCurrent: true,
      isShared: false,
    });
    this.logger.log(`Created live state for user: ${userId}, table: ${dto.tableSlug}`);
    return TableViewDto.from(created, userId);
  }

  // Returns the stored live state for a user+table; returns empty state if no row exists
  async getCurrentState(userId: string, tableSlug: string): Promise<TableViewState> {
    const row = await this.tableViewRepository.findCurrentByUserAndSlug(userId, tableSlug);
    return row?.state ?? EMPTY_TABLE_STATE;
  }

  // Returns all named views for a table — own rows plus shared rows from other users
  async findViews(userId: string, tableSlug: string): Promise<TableViewDto[]> {
    const views = await this.tableViewRepository.findNamedViewsBySlug(userId, tableSlug);
    return views.map((view) => TableViewDto.from(view, userId));
  }

  // Creates a named snapshot of the current table state
  async createView(userId: string, dto: CreateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.create({
      userId,
      tableSlug: dto.tableSlug,
      name: dto.name,
      state: dto.state,
      isShared: dto.isShared ?? false,
      isCurrent: false,
    });
    this.logger.log(`Created view "${dto.name}" for user: ${userId}, table: ${dto.tableSlug}`);
    return TableViewDto.from(view, userId);
  }

  // Updates a named view — validates ownership and that the row is not the live state
  async updateView(userId: string, id: string, dto: UpdateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) {
      throw new NotFoundException('Table view not found.');
    }
    if (view.userId !== userId) {
      throw new BadRequestException('You do not have permission to update this view.');
    }
    if (view.isCurrent) {
      throw new BadRequestException('The live state row cannot be updated via this endpoint.');
    }

    const updated = await this.tableViewRepository.update(id, dto);
    this.logger.log(`Updated view ${id} for user: ${userId}`);
    return TableViewDto.from(updated, userId);
  }

  // Deletes a named view — validates ownership and that the row is not the live state
  async deleteView(userId: string, id: string): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) {
      throw new NotFoundException('Table view not found.');
    }
    if (view.userId !== userId) {
      throw new BadRequestException('You do not have permission to delete this view.');
    }
    if (view.isCurrent) {
      throw new BadRequestException('The live state row cannot be deleted via this endpoint.');
    }

    await this.tableViewRepository.delete(id);
    this.logger.log(`Deleted view ${id} for user: ${userId}`);
    return TableViewDto.from(view, userId);
  }
}
