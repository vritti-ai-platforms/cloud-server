import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, isNull } from '@vritti/api-sdk/drizzle-orm';
import { type EmailChangeRequest, emailChangeRequests } from '@/db/schema';

@Injectable()
export class EmailChangeRequestRepository extends PrimaryBaseRepository<typeof emailChangeRequests> {
  constructor(database: PrimaryDatabaseService) {
    super(database, emailChangeRequests);
  }

  /**
   * Find email change request by ID
   */
  async findById(id: string): Promise<EmailChangeRequest | undefined> {
    return this.findOne({ id });
  }

  /**
   * Find active (non-completed) email change requests for a user
   */
  async findActiveByUserId(userId: string): Promise<EmailChangeRequest[]> {
    return this.findMany({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find email change request by revert token
   */
  async findByRevertToken(revertToken: string): Promise<EmailChangeRequest | undefined> {
    return this.findOne({ revertToken });
  }

  /**
   * Mark email change request as completed
   */
  async markAsCompleted(id: string, revertToken: string, revertExpiresAt: Date): Promise<EmailChangeRequest> {
    return this.update(id, {
      isCompleted: true,
      completedAt: new Date(),
      revertToken,
      revertExpiresAt,
    });
  }

  /**
   * Mark email change request as reverted
   */
  async markAsReverted(id: string): Promise<EmailChangeRequest> {
    return this.update(id, {
      revertedAt: new Date(),
    });
  }

  /**
   * Delete incomplete change requests for a user
   * Used to clean up before creating a new request
   */
  async deleteIncompleteForUser(userId: string): Promise<number> {
    const condition = and(eq(emailChangeRequests.userId, userId), eq(emailChangeRequests.isCompleted, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }

  /**
   * Find completed but not reverted email change request by user ID and revert token
   */
  async findCompletedByRevertToken(revertToken: string): Promise<EmailChangeRequest | undefined> {
    const condition = and(
      eq(emailChangeRequests.revertToken, revertToken),
      eq(emailChangeRequests.isCompleted, true),
      isNull(emailChangeRequests.revertedAt),
    );
    if (!condition) {
      return undefined;
    }
    const results = await this.db.select().from(emailChangeRequests).where(condition).limit(1);
    return results[0];
  }
}
