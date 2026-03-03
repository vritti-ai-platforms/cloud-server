import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, CacheService, NotFoundException, type TableViewState } from '@vritti/api-sdk';
import { ConfigService } from '@nestjs/config';
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

// Computes a deterministic SHA-256 checksum of any value for cache validation
function computeChecksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

@Injectable()
export class TableViewService {
  private readonly logger = new Logger(TableViewService.name);

  constructor(
    private readonly tableViewRepository: TableViewRepository,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  // Builds the Redis key for a user's named views list for a given table
  private viewsKey(userId: string, tableSlug: string): string {
    return `tv:${userId}:${tableSlug}`;
  }

  // Returns configured TTL for named views in seconds, defaulting to 86400 (24h)
  private get viewsTtl(): number {
    return this.configService.get<number>('TABLE_VIEWS_CACHE_TTL') ?? 86400;
  }

  // Saves live table state to Redis; DB is not written — no isCurrent rows created
  async upsertCurrentState(userId: string, dto: UpsertTableStateDto): Promise<void> {
    const ttl = this.configService.get<number>('TABLE_STATE_CACHE_TTL') ?? 3600;
    const key = `dt:${userId}:${dto.tableSlug}`;
    await this.cacheService.set(key, dto.state, ttl);
    this.logger.log(`Cached live state for user: ${userId}, table: ${dto.tableSlug}`);
  }

  // Returns live table state from Redis; returns empty state on miss — no DB query
  async getCurrentState(userId: string, tableSlug: string): Promise<TableViewState> {
    const key = `dt:${userId}:${tableSlug}`;
    const cached = await this.cacheService.get<TableViewState>(key);
    return cached ?? EMPTY_TABLE_STATE;
  }

  // Returns all named views — hits cache first, falls back to DB on miss and warms cache
  async findViews(userId: string, tableSlug: string): Promise<TableViewDto[]> {
    const key = this.viewsKey(userId, tableSlug);
    const cached = await this.cacheService.get<{ views: TableViewDto[]; checksum: string }>(key);
    if (cached) {
      this.logger.debug(`Cache hit for views: user=${userId}, table=${tableSlug}`);
      return cached.views;
    }
    const rows = await this.tableViewRepository.findNamedViewsBySlug(userId, tableSlug);
    const views = rows.map((row) => TableViewDto.from(row, userId));
    const checksum = computeChecksum(views);
    await this.cacheService.set(key, { views, checksum }, this.viewsTtl);
    return views;
  }

  // Creates a named snapshot and invalidates the views list cache
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
    await this.cacheService.del(this.viewsKey(userId, dto.tableSlug));
    return TableViewDto.from(view, userId);
  }

  // Updates a named view — skips DB write if state checksum is unchanged
  async updateView(userId: string, id: string, dto: UpdateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to update this view.');
    if (view.isCurrent) throw new BadRequestException('The live state row cannot be updated via this endpoint.');

    // Skip DB write if only state was sent and it has not changed
    if (dto.state !== undefined) {
      const newChecksum = computeChecksum(dto.state);
      const currentChecksum = computeChecksum(view.state);
      if (newChecksum === currentChecksum) {
        this.logger.log(`State unchanged for view ${id} — skipping DB write`);
        return TableViewDto.from(view, userId);
      }
    }

    const updated = await this.tableViewRepository.update(id, dto);
    this.logger.log(`Updated view ${id} for user: ${userId}`);
    await this.cacheService.del(this.viewsKey(userId, view.tableSlug));
    return TableViewDto.from(updated, userId);
  }

  // Deletes a named view and invalidates the views list cache
  async deleteView(userId: string, id: string): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to delete this view.');
    if (view.isCurrent) throw new BadRequestException('The live state row cannot be deleted via this endpoint.');

    await this.tableViewRepository.delete(id);
    this.logger.log(`Deleted view ${id} for user: ${userId}`);
    await this.cacheService.del(this.viewsKey(userId, view.tableSlug));
    return TableViewDto.from(view, userId);
  }
}
