import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, lt } from '@vritti/api-sdk/drizzle-orm';
import { type Session, sessions } from '@/db/schema';

@Injectable()
export class SessionRepository extends PrimaryBaseRepository<typeof sessions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, sessions);
  }

  // Finds a session by the hashed access token
  async findByAccessTokenHash(accessTokenHash: string): Promise<Session | undefined> {
    return this.model.findFirst({
      where: { accessTokenHash },
    });
  }

  // Finds a session by the hashed refresh token
  async findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | undefined> {
    return this.model.findFirst({
      where: { refreshTokenHash },
    });
  }

  // Updates the access and refresh token hashes and extends session expiry
  async rotateTokens(id: string, accessTokenHash: string, refreshTokenHash: string, expiresAt: Date): Promise<Session> {
    return this.update(id, { accessTokenHash, refreshTokenHash, expiresAt });
  }

  // Updates only the access token hash for a session
  async updateAccessTokenHash(id: string, accessTokenHash: string): Promise<Session> {
    return this.update(id, { accessTokenHash });
  }

  // Removes all sessions for a user, returning the count deleted
  async deleteAllByUserId(userId: string): Promise<number> {
    const condition = eq(sessions.userId, userId);
    const result = await this.deleteMany(condition);
    return result.count;
  }

  // Removes sessions whose expiry has passed
  async deleteExpired(): Promise<number> {
    const result = await this.deleteMany(lt(sessions.expiresAt, new Date()));
    return result.count;
  }

  // Finds all sessions for a user ordered by most recent first
  async findAllByUserId(userId: string): Promise<Session[]> {
    return this.model.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
