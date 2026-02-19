import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { type PasswordReset, passwordResets } from '@/db/schema';

@Injectable()
export class PasswordResetRepository extends PrimaryBaseRepository<typeof passwordResets> {
  constructor(database: PrimaryDatabaseService) {
    super(database, passwordResets);
  }

  // Finds the most recent unused reset request for an email
  async findLatestByEmail(email: string): Promise<PasswordReset | undefined> {
    const results = await this.findMany({
      where: { email, isUsed: false },
      orderBy: { createdAt: 'desc' },
      limit: 1,
    });
    return results[0];
  }

  // Finds an unused reset request by its one-time token
  async findByResetToken(resetToken: string): Promise<PasswordReset | undefined> {
    const results = await this.findMany({
      where: { resetToken, isUsed: false },
      limit: 1,
    });
    return results[0];
  }

  // Stores the one-time reset token after OTP verification
  async storeResetToken(id: string, resetToken: string): Promise<PasswordReset> {
    return this.update(id, { resetToken });
  }

  // Marks a reset request as consumed after the password has been changed
  async markAsUsed(id: string): Promise<PasswordReset> {
    return this.update(id, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  // Deletes all password reset requests for a user
  async deleteByUserId(userId: string): Promise<number> {
    const condition = eq(passwordResets.userId, userId);
    const result = await this.deleteMany(condition);
    return result.count;
  }
}
