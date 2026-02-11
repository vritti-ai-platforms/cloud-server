import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, lt } from '@vritti/api-sdk/drizzle-orm';
import { type Session, sessions } from '@/db/schema';

@Injectable()
export class SessionRepository extends PrimaryBaseRepository<typeof sessions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, sessions);
  }

  // Finds all active sessions for a user ordered by most recent first
  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.model.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Updates only the access token and its expiry for a session
  async updateAccessToken(id: string, accessToken: string, accessTokenExpiresAt: Date): Promise<Session> {
    return this.update(id, {
      accessToken,
      accessTokenExpiresAt,
    });
  }

  // Deactivates all active sessions for a user, returning the count affected
  async invalidateAllByUserId(userId: string): Promise<number> {
    const condition = and(eq(sessions.userId, userId), eq(sessions.isActive, true));
    if (!condition) {
      return 0;
    }
    const result = await this.updateMany(condition, {
      isActive: false,
    });
    return result.count;
  }

  // Removes sessions whose refresh tokens have expired
  async deleteExpired(): Promise<number> {
    const result = await this.deleteMany(lt(sessions.refreshTokenExpiresAt, new Date()));
    return result.count;
  }
}
