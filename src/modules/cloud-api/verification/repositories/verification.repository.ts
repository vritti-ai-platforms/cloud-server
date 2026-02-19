import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, desc, eq, lt, sql } from '@vritti/api-sdk/drizzle-orm';
import { type Verification, verifications } from '@/db/schema';
import type { VerificationChannel } from '@/db/schema/enums';

@Injectable()
export class VerificationRepository extends PrimaryBaseRepository<typeof verifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, verifications);
  }

  // Finds the most recent verification record for a user and channel
  async findLatestByUserIdAndChannel(userId: string, channel: VerificationChannel): Promise<Verification | undefined> {
    const results = (await this.db
      .select()
      .from(verifications)
      .where(and(eq(verifications.userId, userId), eq(verifications.channel, channel)))
      .orderBy(desc(verifications.createdAt))
      .limit(1)) as Verification[];
    return results[0];
  }

  // Atomically increments the attempt counter for a verification record
  async incrementAttempts(id: string): Promise<Verification> {
    this.logger.debug(`Incrementing attempts for verification: ${id}`);
    const results = (await this.db
      .update(verifications)
      .set({
        attempts: sql`${verifications.attempts} + 1`,
      })
      .where(eq(verifications.id, id))
      .returning()) as Verification[];
    const result = results[0];
    if (!result) {
      throw new Error(`Failed to increment attempts: verification ${id} not found`);
    }
    return result;
  }

  // Marks a verification as verified with the current timestamp
  async markAsVerified(id: string): Promise<Verification> {
    return this.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
    });
  }

  // Removes all expired, unverified verification records
  async deleteExpired(): Promise<number> {
    const condition = and(lt(verifications.expiresAt, new Date()), eq(verifications.isVerified, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }
}
