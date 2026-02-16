import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt, ne, sql } from '@vritti/api-sdk/drizzle-orm';
import { type Verification, verifications } from '@/db/schema';

@Injectable()
export class MobileVerificationRepository extends PrimaryBaseRepository<typeof verifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, verifications);
  }

  // Finds the most recent mobile verification record for a user
  async findLatestByUserId(userId: string): Promise<Verification | undefined> {
    const results = await this.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  // Looks up a verification record by its verificationId token
  async findByVerificationId(verificationId: string): Promise<Verification | undefined> {
    return this.model.findFirst({
      where: { verificationId },
    });
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

  // Checks whether the phone number (target) is already verified by a different user
  async isPhoneVerifiedByOtherUser(phone: string, excludeUserId?: string): Promise<boolean> {
    let condition = and(eq(verifications.target, phone), eq(verifications.isVerified, true));

    if (excludeUserId) {
      condition = and(condition, ne(verifications.userId, excludeUserId));
    }

    const count = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(verifications)
      .where(condition);

    return Number(count[0]?.count) > 0;
  }

  // Updates the phone number (target field) on a verification record
  async updatePhone(id: string, phone: string): Promise<Verification> {
    return this.update(id, {
      target: phone,
    });
  }
}
