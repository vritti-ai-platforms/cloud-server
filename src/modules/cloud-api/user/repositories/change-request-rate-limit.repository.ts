import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, sql } from '@vritti/api-sdk/drizzle-orm';
import { type ChangeRequestRateLimit, changeRequestRateLimits } from '@/db/schema';

@Injectable()
export class ChangeRequestRateLimitRepository extends PrimaryBaseRepository<typeof changeRequestRateLimits> {
  constructor(database: PrimaryDatabaseService) {
    super(database, changeRequestRateLimits);
  }

  /**
   * Find rate limit record by user ID, change type, and date
   */
  async findByUserAndDate(
    userId: string,
    changeType: 'email' | 'phone',
    date: string,
  ): Promise<ChangeRequestRateLimit | undefined> {
    const condition = and(
      eq(changeRequestRateLimits.userId, userId),
      eq(changeRequestRateLimits.changeType, changeType),
      eq(changeRequestRateLimits.date, date),
    );
    if (!condition) {
      return undefined;
    }
    const results = await this.db.select().from(changeRequestRateLimits).where(condition).limit(1);
    return results[0];
  }

  /**
   * Increment request count for a rate limit record
   */
  async incrementCount(id: string): Promise<ChangeRequestRateLimit> {
    this.logger.debug(`Incrementing request count for rate limit: ${id}`);
    const results = (await this.db
      .update(changeRequestRateLimits)
      .set({
        requestCount: sql`${changeRequestRateLimits.requestCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(changeRequestRateLimits.id, id))
      .returning()) as ChangeRequestRateLimit[];
    const result = results[0];
    if (!result) {
      throw new Error(`Failed to increment count: rate limit ${id} not found`);
    }
    return result;
  }
}
