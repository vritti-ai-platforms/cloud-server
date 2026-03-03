import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, CacheService, NotFoundException, type TableViewState } from '@vritti/api-sdk';
import { TableViewDto } from '../dto/entity/table-view.dto';
import type { CreateTableViewDto } from '../dto/request/create-table-view.dto';
import type { UpdateTableViewDto } from '../dto/request/update-table-view.dto';
import type { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';
import { TableViewRepository } from '../repositories/table-view.repository';

const EMPTY_TABLE_STATE: TableViewState = {
  filters: [],
  sort: [],
  columnVisibility: {},
};

// Computes a deterministic SHA-256 checksum of a value for equality comparison
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

  // Builds the Redis key for a user's personal (non-shared) views for a given table
  private personalViewsKey(userId: string, tableSlug: string): string {
    return `views:personal:${userId}:${tableSlug}`;
  }

  // Builds the Redis key for all shared views for a given table — same key for all users
  private sharedViewsKey(tableSlug: string): string {
    return `views:shared:${tableSlug}`;
  }

  // Returns configured TTL for named views in seconds, defaulting to 86400 (24h)
  private get viewsTtl(): number {
    return this.configService.get<number>('TABLE_VIEWS_CACHE_TTL') ?? 86400;
  }

  // Returns configured TTL for live table state in seconds, defaulting to 3600 (1h)
  private get stateTtl(): number {
    return this.configService.get<number>('TABLE_STATE_CACHE_TTL') ?? 3600;
  }

  // Fetches personal views from cache; falls back to DB and warms cache on miss
  private async getOrCachePersonalViews(userId: string, tableSlug: string): Promise<TableViewDto[]> {
    const key = this.personalViewsKey(userId, tableSlug);
    const cached = await this.cacheService.get<TableViewDto[]>(key);
    if (cached) {
      this.logger.debug(`Cache hit for personal views: user=${userId}, table=${tableSlug}`);
      return cached;
    }
    const rows = await this.tableViewRepository.findPersonalViewsBySlug(userId, tableSlug);
    const views = rows.map((row) => TableViewDto.from(row));
    await this.cacheService.set(key, views, this.viewsTtl);
    return views;
  }

  // Fetches shared views from cache; falls back to DB and warms cache on miss
  private async getOrCacheSharedViews(tableSlug: string): Promise<TableViewDto[]> {
    const key = this.sharedViewsKey(tableSlug);
    const cached = await this.cacheService.get<TableViewDto[]>(key);
    if (cached) {
      this.logger.debug(`Cache hit for shared views: table=${tableSlug}`);
      return cached;
    }
    const rows = await this.tableViewRepository.findSharedViewsBySlug(tableSlug);
    const views = rows.map((row) => TableViewDto.from(row));
    await this.cacheService.set(key, views, this.viewsTtl);
    return views;
  }

  // Deletes personal and/or shared cache keys based on which pools the mutation affects
  private async invalidateViewsCache(
    userId: string,
    tableSlug: string,
    affectsPersonal: boolean,
    affectsShared: boolean,
  ): Promise<void> {
    const toDelete: string[] = [];
    if (affectsPersonal) toDelete.push(this.personalViewsKey(userId, tableSlug));
    if (affectsShared) toDelete.push(this.sharedViewsKey(tableSlug));
    if (toDelete.length > 0) await this.cacheService.del(...toDelete);
  }

  // Saves live table state to Redis; DB is not written
  async upsertCurrentState(userId: string, dto: UpsertTableStateDto): Promise<void> {
    const key = `dt:${userId}:${dto.tableSlug}`;
    await this.cacheService.set(key, dto.state, this.stateTtl);
    this.logger.log(`Cached live state for user: ${userId}, table: ${dto.tableSlug}`);
  }

  // Returns live table state from Redis; returns empty state on miss — no DB query
  async getCurrentState(userId: string, tableSlug: string): Promise<TableViewState> {
    const key = `dt:${userId}:${tableSlug}`;
    const cached = await this.cacheService.get<TableViewState>(key);
    return cached ?? EMPTY_TABLE_STATE;
  }

  // Returns personal + shared named views — each pool fetched from cache or DB in parallel
  async findViews(userId: string, tableSlug: string): Promise<TableViewDto[]> {
    const [personalViews, sharedViews] = await Promise.all([
      this.getOrCachePersonalViews(userId, tableSlug),
      this.getOrCacheSharedViews(tableSlug),
    ]);
    return [...personalViews, ...sharedViews];
  }

  // Creates a named snapshot and invalidates the relevant cache pool
  async createView(userId: string, dto: CreateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.create({
      userId,
      tableSlug: dto.tableSlug,
      name: dto.name,
      state: dto.state,
      isShared: dto.isShared ?? false,
    });
    this.logger.log(`Created view "${dto.name}" for user: ${userId}, table: ${dto.tableSlug}`);
    const isShared = dto.isShared ?? false;
    await this.invalidateViewsCache(userId, dto.tableSlug, !isShared, isShared);
    return TableViewDto.from(view);
  }

  // Updates a named view — skips DB write if state is the sole field and is unchanged
  async updateView(userId: string, id: string, dto: UpdateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to update this view.');

    // Skip DB write only when state is the sole field being changed and it hasn't changed
    const onlyStateSent = dto.name === undefined && dto.isShared === undefined;
    if (onlyStateSent && dto.state !== undefined) {
      if (computeChecksum(dto.state) === computeChecksum(view.state)) {
        this.logger.log(`State unchanged for view ${id} — skipping DB write`);
        return TableViewDto.from(view);
      }
    }

    const updated = await this.tableViewRepository.update(id, dto);
    this.logger.log(`Updated view ${id} for user: ${userId}`);
    const wasShared = view.isShared;
    const willBeShared = dto.isShared ?? view.isShared;
    await this.invalidateViewsCache(userId, view.tableSlug, !(wasShared && willBeShared), wasShared || willBeShared);
    return TableViewDto.from(updated);
  }

  // Deletes a named view and invalidates the relevant cache pool
  async deleteView(userId: string, id: string): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to delete this view.');

    await this.tableViewRepository.delete(id);
    this.logger.log(`Deleted view ${id} for user: ${userId}`);
    await this.invalidateViewsCache(userId, view.tableSlug, !view.isShared, view.isShared);
    return TableViewDto.from(view);
  }
}
