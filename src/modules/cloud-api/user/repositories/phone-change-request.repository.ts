import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, isNull } from '@vritti/api-sdk/drizzle-orm';
import { type PhoneChangeRequest, phoneChangeRequests } from '@/db/schema';

@Injectable()
export class PhoneChangeRequestRepository extends PrimaryBaseRepository<typeof phoneChangeRequests> {
  constructor(database: PrimaryDatabaseService) {
    super(database, phoneChangeRequests);
  }

  // Finds a phone change request by its ID
  async findById(id: string): Promise<PhoneChangeRequest | undefined> {
    return this.findOne({ id });
  }

  // Retrieves all incomplete phone change requests for a user
  async findActiveByUserId(userId: string): Promise<PhoneChangeRequest[]> {
    return this.findMany({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Finds a phone change request by its revert token
  async findByRevertToken(revertToken: string): Promise<PhoneChangeRequest | undefined> {
    return this.findOne({ revertToken });
  }

  // Marks a phone change request as completed with revert token
  async markAsCompleted(id: string, revertToken: string, revertExpiresAt: Date): Promise<PhoneChangeRequest> {
    return this.update(id, {
      isCompleted: true,
      completedAt: new Date(),
      revertToken,
      revertExpiresAt,
    });
  }

  // Marks a phone change request as reverted
  async markAsReverted(id: string): Promise<PhoneChangeRequest> {
    return this.update(id, {
      revertedAt: new Date(),
    });
  }

  // Deletes all incomplete phone change requests for a user
  async deleteIncompleteForUser(userId: string): Promise<number> {
    const condition = and(eq(phoneChangeRequests.userId, userId), eq(phoneChangeRequests.isCompleted, false));
    if (!condition) {
      return 0;
    }
    const result = await this.deleteMany(condition);
    return result.count;
  }

  // Finds a completed, non-reverted phone change request by revert token
  async findCompletedByRevertToken(revertToken: string): Promise<PhoneChangeRequest | undefined> {
    const condition = and(
      eq(phoneChangeRequests.revertToken, revertToken),
      eq(phoneChangeRequests.isCompleted, true),
      isNull(phoneChangeRequests.revertedAt),
    );
    if (!condition) {
      return undefined;
    }
    const results = await this.db.select().from(phoneChangeRequests).where(condition).limit(1);
    return results[0];
  }
}
