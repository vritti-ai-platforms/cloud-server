import { type PasswordReset, passwordResets } from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';

@Injectable()
export class PasswordResetRepository extends PrimaryBaseRepository<typeof passwordResets> {
  constructor(database: PrimaryDatabaseService) {
    super(database, passwordResets);
  }

  /**
   * Find the most recent non-verified, non-used password reset for an email
   */
  async findLatestByEmail(email: string): Promise<PasswordReset | undefined> {
    const results = await this.findMany({
      where: { email, isVerified: false, isUsed: false },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  /**
   * Find a password reset by reset token (after OTP verified)
   */
  async findByResetToken(resetToken: string): Promise<PasswordReset | undefined> {
    const results = await this.findMany({
      where: { resetToken, isVerified: true, isUsed: false },
      limit: 1,
    });
    return results[0];
  }

  /**
   * Increment failed OTP attempts
   */
  async incrementAttempts(id: string): Promise<PasswordReset> {
    this.logger.debug(`Incrementing attempts for password reset: ${id}`);
    const results = (await this.db
      .update(passwordResets)
      .set({
        attempts: sql`${passwordResets.attempts} + 1`,
      })
      .where(eq(passwordResets.id, id))
      .returning()) as PasswordReset[];
    const result = results[0];
    if (!result) {
      throw new Error(`Failed to increment attempts: password reset ${id} not found`);
    }
    return result;
  }

  /**
   * Mark as verified and store the reset token
   */
  async markAsVerified(id: string, resetToken: string): Promise<PasswordReset> {
    return this.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
      resetToken,
    });
  }

  /**
   * Mark as used after password has been changed
   */
  async markAsUsed(id: string): Promise<PasswordReset> {
    return this.update(id, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  /**
   * Delete all password reset records for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const condition = eq(passwordResets.userId, userId);
    const result = await this.deleteMany(condition);
    return result.count;
  }
}