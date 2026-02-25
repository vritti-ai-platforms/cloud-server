import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';
import { type Media, media } from '@/db/schema';

@Injectable()
export class MediaRepository extends PrimaryBaseRepository<typeof media> {
  constructor(database: PrimaryDatabaseService) {
    super(database, media);
  }

  // Finds a media record by ID excluding soft-deleted records
  async findActiveById(id: string): Promise<Media | undefined> {
    return this.model.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Finds active media by entity type and entity ID
  async findByEntity(entityType: string, entityId: string): Promise<Media[]> {
    return this.model.findMany({
      where: { entityType, entityId, deletedAt: null },
    });
  }

  // Finds a ready media record matching the given checksum
  async findByChecksum(checksum: string): Promise<Media | undefined> {
    return this.model.findFirst({
      where: { checksum, status: 'ready' },
    });
  }

  // Counts media records sharing the same storage key
  async countByStorageKey(storageKey: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .where(eq(media.storageKey, storageKey));
    return Number(result[0]?.count ?? 0);
  }

  // Permanently deletes a media record from the database
  async hardDelete(id: string): Promise<void> {
    await this.db.delete(media).where(eq(media.id, id));
  }
}
