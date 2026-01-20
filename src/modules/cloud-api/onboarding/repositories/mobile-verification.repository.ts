import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt, ne, sql } from '@vritti/api-sdk/drizzle-orm';
import { type MobileVerification, mobileVerifications } from '@/db/schema';

@Injectable()
export class MobileVerificationRepository extends PrimaryBaseRepository<typeof mobileVerifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, mobileVerifications);
  }

  /**
   * Find the most recent non-verified mobile verification for a user
   */
  async findLatestByUserId(userId: string): Promise<MobileVerification | undefined> {
    const results = await this.findMany({
      where: { userId, isVerified: false },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  /**
   * Find mobile verification by QR verification ID (token)
   */
  async findByVerificationId(qrVerificationId: string): Promise<MobileVerification | undefined> {
    return this.model.findFirst({
      where: { qrVerificationId },
    });
  }

  /**
   * Increment failed verification attempts
   */
  async incrementAttempts(id: string): Promise<MobileVerification> {
    this.logger.debug(`Incrementing attempts for mobile verification: ${id}`);
    const results = (await this.db
      .update(mobileVerifications)
      .set({
        attempts: sql`${mobileVerifications.attempts} + 1`,
      })
      .where(eq(mobileVerifications.id, id))
      .returning()) as MobileVerification[];

    const result = results[0];
    if (!result) {
      throw new Error(`Failed to increment attempts: mobile verification ${id} not found`);
    }
    return result;
  }

  /**
   * Mark mobile verification as verified
   */
  async markAsVerified(id: string): Promise<MobileVerification> {
    return this.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
      qrScannedAt: new Date(),
    });
  }

  /**
   * Delete expired mobile verifications
   */
  async deleteExpired(): Promise<number> {
    const condition = and(lt(mobileVerifications.expiresAt, new Date()), eq(mobileVerifications.isVerified, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }

  /**
   * Check if a phone number is already verified by another user
   */
  async isPhoneVerifiedByOtherUser(phone: string, excludeUserId?: string): Promise<boolean> {
    let condition = and(eq(mobileVerifications.phone, phone), eq(mobileVerifications.isVerified, true));

    if (excludeUserId) {
      condition = and(condition, ne(mobileVerifications.userId, excludeUserId));
    }

    const count = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(mobileVerifications)
      .where(condition);

    return Number(count[0]?.count) > 0;
  }
}
