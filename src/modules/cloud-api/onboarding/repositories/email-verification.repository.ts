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
    return results[0]!;
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
    const result = await this.deleteMany(
      and(lt(emailVerifications.expiresAt, new Date()), eq(emailVerifications.isVerified, false))!,
    );
    return result.count;
  }
}
