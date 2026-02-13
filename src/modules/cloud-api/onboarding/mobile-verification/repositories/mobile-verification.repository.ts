import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt, ne, sql } from '@vritti/api-sdk/drizzle-orm';
import { type MobileVerification, mobileVerifications } from '@/db/schema';

@Injectable()
export class MobileVerificationRepository extends PrimaryBaseRepository<typeof mobileVerifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, mobileVerifications);
  }

  // Finds the most recent mobile verification record for a user
  async findLatestByUserId(userId: string): Promise<MobileVerification | undefined> {
    const results = await this.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  // Looks up a verification record by its QR/token identifier
  async findByVerificationId(qrVerificationId: string): Promise<MobileVerification | undefined> {
    return this.model.findFirst({
      where: { qrVerificationId },
    });
  }

  // Atomically increments the attempt counter for a verification record
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

  // Marks a verification as verified with the current timestamp
  async markAsVerified(id: string): Promise<MobileVerification> {
    return this.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
      qrScannedAt: new Date(),
    });
  }

  // Removes all expired, unverified mobile verification records
  async deleteExpired(): Promise<number> {
    const condition = and(lt(mobileVerifications.expiresAt, new Date()), eq(mobileVerifications.isVerified, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }

  // Checks whether the phone number is already verified by a different user
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

  // Updates the phone number (and optionally country) on a verification record
  async updatePhone(id: string, phone: string, phoneCountry?: string): Promise<MobileVerification> {
    return this.update(id, {
      phone,
      ...(phoneCountry ? { phoneCountry } : {}),
    });
  }
}
