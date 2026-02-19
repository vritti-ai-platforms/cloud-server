import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt, ne, sql } from '@vritti/api-sdk/drizzle-orm';
import { type Verification, verifications } from '@/db/schema';
import type { VerificationChannel } from '@/db/schema/enums';

// Repository pattern: Prefer this.model for simple queries, use this.db for complex operations
// - Use this.model.findFirst({ where: { field: value } }) for simple lookups with equality checks
// - Use this.db when you need: complex conditions (ne, or, not), SQL expressions (sql``), aggregations (count, sum), atomic operations (increment)
@Injectable()
export class VerificationRepository extends PrimaryBaseRepository<typeof verifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, verifications);
  }

  // Finds the verification record for a user and channel (single record due to unique constraint)
  async findByUserIdAndChannel(userId: string, channel: VerificationChannel): Promise<Verification | undefined> {
    return this.model.findFirst({
      where: { userId, channel },
    });
  }

  // Finds or creates a verification record for a user and channel, resetting it to pending state
  async upsertByUserIdAndChannel(
    userId: string,
    channel: VerificationChannel,
    data: {
      target: string | null;
      verificationId?: string;
      hashedOtp?: string;
      expiresAt: Date;
    },
  ): Promise<Verification> {
    const existing = await this.findByUserIdAndChannel(userId, channel);

    if (existing) {
      // Update existing record, resetting verification state
      return this.update(existing.id, {
        target: data.target,
        verificationId: data.verificationId,
        hashedOtp: data.hashedOtp,
        expiresAt: data.expiresAt,
        attempts: 0,
        isVerified: false,
        verifiedAt: null,
      });
    }

    // Create new record
    return this.create({
      userId,
      channel,
      target: data.target,
      verificationId: data.verificationId,
      hashedOtp: data.hashedOtp,
      expiresAt: data.expiresAt,
      attempts: 0,
      isVerified: false,
    });
  }

  // Looks up a verification record by its verificationId token and channel
  async findByVerificationIdAndChannel(
    verificationId: string,
    channel: VerificationChannel,
  ): Promise<Verification | undefined> {
    return this.model.findFirst({
      where: { verificationId, channel },
    });
  }

  // Checks whether the target (email/phone) is already verified by a different user
  async isTargetVerifiedByOtherUser(target: string, excludeUserId?: string): Promise<boolean> {
    let condition = and(eq(verifications.target, target), eq(verifications.isVerified, true));

    if (excludeUserId) {
      condition = and(condition, ne(verifications.userId, excludeUserId));
    }

    const count = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(verifications)
      .where(condition);

    return Number(count[0]?.count) > 0;
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
