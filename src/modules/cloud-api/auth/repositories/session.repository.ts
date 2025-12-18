import { Injectable } from '@nestjs/common';
import {
  PrimaryBaseRepository,
  PrimaryDatabaseService,
} from '@vritti/api-sdk';
import { eq, and, lt, desc } from '@vritti/api-sdk/drizzle-orm';
import { sessions, Session } from '@/db/schema';

@Injectable()
export class SessionRepository extends PrimaryBaseRepository<typeof sessions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, sessions);
  }

  /**
   * Find all active sessions for a user
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.model.findMany({
      where: and(
        eq(sessions.userId, userId),
        eq(sessions.isActive, true),
      ),
      orderBy: desc(sessions.createdAt),
    });
  }

  /**
   * Update session access token
   */
  async updateAccessToken(
    id: string,
    accessToken: string,
    accessTokenExpiresAt: Date,
  ): Promise<Session> {
    return this.update(id, {
      accessToken,
      accessTokenExpiresAt,
    });
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllByUserId(userId: string): Promise<number> {
    const result = await this.updateMany(
      and(eq(sessions.userId, userId), eq(sessions.isActive, true))!,
      { isActive: false },
    );
    return result.count;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    const result = await this.deleteMany(
      lt(sessions.refreshTokenExpiresAt, new Date()),
    );
    return result.count;
  }
}
