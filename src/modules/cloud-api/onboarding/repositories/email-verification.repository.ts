import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt, sql } from '@vritti/api-sdk/drizzle-orm';
import { type EmailVerification, emailVerifications } from '@/db/schema';

@Injectable()
export class EmailVerificationRepository extends PrimaryBaseRepository<typeof emailVerifications> {
  constructor(database: PrimaryDatabaseService) {
    super(database, emailVerifications);
  }

  /**
   * Find the most recent non-verified email verification for a user
   */
  async findLatestByUserId(userId: string): Promise<EmailVerification | undefined> {
    const results = await this.findMany({
      where: { userId, isVerified: false },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  /**
   * Increment failed verification attempts
   */
  async incrementAttempts(id: string): Promise<EmailVerification> {
    this.logger.debug(`Incrementing attempts for email verification: ${id}`);
    const results = (await this.db
      .update(emailVerifications)
      .set({
        attempts: sql`${emailVerifications.attempts} + 1`,
      })
      .where(eq(emailVerifications.id, id))
      .returning()) as EmailVerification[];
    const result = results[0];
    if (!result) {
      throw new Error(`Failed to increment attempts: email verification ${id} not found`);
    }
    return result;
  }

  /**
   * Mark email verification as verified
   */
  async markAsVerified(id: string): Promise<EmailVerification> {
    return this.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
    });
  }

  /**
   * Delete expired email verifications
   */
  async deleteExpired(): Promise<number> {
    const condition = and(lt(emailVerifications.expiresAt, new Date()), eq(emailVerifications.isVerified, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }
}
