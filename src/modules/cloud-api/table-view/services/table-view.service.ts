import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, CacheService, ConflictException, NotFoundException, type TableViewState } from '@vritti/api-sdk';
import type { TableView } from '@/db/schema';
import { TableViewDto } from '../dto/entity/table-view.dto';
import type { CreateTableViewDto } from '../dto/request/create-table-view.dto';
import type { UpdateTableViewDto } from '../dto/request/update-table-view.dto';
import type { UpsertTableStateDto } from '../dto/request/upsert-table-state.dto';
import { TableViewRepository } from '../repositories/table-view.repository';

const EMPTY_TABLE_STATE: TableViewState = {
  filters: [],
  sort: [],
  columnVisibility: {},
  columnOrder: [],
  columnSizing: {},
  columnPinning: { left: [], right: [] },
  lockedColumnSizing: false,
  density: 'normal',
  filterOrder: [],
  filterVisibility: {},
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
  private async getOrCachePersonalViews(userId: string, tableSlug: string): Promise<TableView[]> {
    const key = this.personalViewsKey(userId, tableSlug);
    const cached = await this.cacheService.get<TableView[]>(key);
    if (cached) {
      this.logger.debug(`Cache hit for personal views: user=${userId}, table=${tableSlug}`);
      return cached;
    }
    const rows = await this.tableViewRepository.findPersonalViewsBySlug(userId, tableSlug);
    await this.cacheService.set(key, rows, this.viewsTtl);
    return rows;
  }

  // Fetches shared views from cache; falls back to DB and warms cache on miss
  private async getOrCacheSharedViews(tableSlug: string): Promise<TableView[]> {
    const key = this.sharedViewsKey(tableSlug);
    const cached = await this.cacheService.get<TableView[]>(key);
    if (cached) {
      this.logger.debug(`Cache hit for shared views: table=${tableSlug}`);
      return cached;
    }
    const rows = await this.tableViewRepository.findSharedViewsBySlug(tableSlug);
    await this.cacheService.set(key, rows, this.viewsTtl);
    return rows;
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

  // Saves live table state and active view ID to Redis; DB is not written
  async upsertCurrentState(userId: string, dto: UpsertTableStateDto): Promise<void> {
    const key = `dt:${userId}:${dto.tableSlug}`;
    await this.cacheService.set(key, { state: dto.state, activeViewId: dto.activeViewId ?? null }, this.stateTtl);
    this.logger.log(`Cached live state for user: ${userId}, table: ${dto.tableSlug}`);
  }

  // Returns live table state and active view ID from Redis; returns empty state on miss — no DB query
  async getCurrentState(userId: string, tableSlug: string): Promise<{ state: TableViewState; activeViewId: string | null }> {
    const key = `dt:${userId}:${tableSlug}`;
    const cached = await this.cacheService.get<{ state: TableViewState; activeViewId: string | null }>(key);
    return cached ?? { state: EMPTY_TABLE_STATE, activeViewId: null };
  }

  // Returns personal + shared named views — each pool fetched from cache or DB in parallel
  async findViews(userId: string, tableSlug: string): Promise<TableViewDto[]> {
    const [personalRows, sharedRows] = await Promise.all([
      this.getOrCachePersonalViews(userId, tableSlug),
      this.getOrCacheSharedViews(tableSlug),
    ]);
    return [...personalRows, ...sharedRows].map((row) => TableViewDto.from(row, userId));
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
    return TableViewDto.from(view, userId);
  }

  // Updates the state of a named view — skips DB write if state is unchanged
  async updateView(userId: string, id: string, dto: UpdateTableViewDto): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to update this view.');

    // Skip DB write if the state has not changed
    if (computeChecksum(dto.state) === computeChecksum(view.state)) {
      this.logger.log(`State unchanged for view ${id} — skipping DB write`);
      return TableViewDto.from(view, userId);
    }

    const updated = await this.tableViewRepository.update(id, { state: dto.state });
    this.logger.log(`Updated state for view ${id}, user: ${userId}`);
    await this.invalidateViewsCache(userId, view.tableSlug, !view.isShared, view.isShared);
    return TableViewDto.from(updated, userId);
  }

  // Toggles the sharing status of a named view — updates both personal and shared cache
  async toggleShareView(userId: string, id: string, isShared: boolean): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to share this view.');

    const updated = await this.tableViewRepository.update(id, { isShared });
    this.logger.log(`Set isShared=${isShared} for view ${id}, user: ${userId}`);
    // Invalidate both pools — the view moves from one to the other
    await this.invalidateViewsCache(userId, view.tableSlug, true, true);
    return TableViewDto.from(updated, userId);
  }

  // Renames a named view — enforces unique name per user+table, invalidates personal cache
  async renameView(userId: string, id: string, name: string): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to rename this view.');

    // Check for duplicate name within the same user+table
    const existing = await this.tableViewRepository.findOne({ userId, tableSlug: view.tableSlug, name, isShared: false });
    if (existing && existing.id !== id) {
      throw new ConflictException({
        label: 'Name Already Taken',
        detail: 'A view with this name already exists for this table.',
        errors: [{ field: 'name', message: 'Name already taken' }],
      });
    }

    const updated = await this.tableViewRepository.update(id, { name });
    this.logger.log(`Renamed view ${id} to "${name}" for user: ${userId}`);
    // Rename only affects personal views (shared views are owned by a user too, but visible to all)
    await this.invalidateViewsCache(userId, view.tableSlug, !view.isShared, view.isShared);
    return TableViewDto.from(updated, userId);
  }

  // Deletes a named view and invalidates the relevant cache pool
  async deleteView(userId: string, id: string): Promise<TableViewDto> {
    const view = await this.tableViewRepository.findById(id);
    if (!view) throw new NotFoundException('Table view not found.');
    if (view.userId !== userId) throw new BadRequestException('You do not have permission to delete this view.');

    await this.tableViewRepository.delete(id);
    this.logger.log(`Deleted view ${id} for user: ${userId}`);
    await this.invalidateViewsCache(userId, view.tableSlug, !view.isShared, view.isShared);
    return TableViewDto.from(view, userId);
  }
}
