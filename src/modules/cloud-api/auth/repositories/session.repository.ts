import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, Session } from '@prisma/client';
import { PrimaryDatabaseService } from '@vritti/api-sdk';

@Injectable()
export class SessionRepository {
  private readonly logger = new Logger(SessionRepository.name);

  constructor(private readonly database: PrimaryDatabaseService) {}

  /**
   * Get Prisma client for session database
   */
  private async getPrisma(): Promise<PrismaClient> {
    return await this.database.getPrimaryDbClient<PrismaClient>();
  }

  /**
   * Create a new session
   */
  async create(data: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    const prisma = await this.getPrisma();
    this.logger.log(`Creating session for user: ${data.userId}`);

    return await prisma.session.create({
      data: {
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Find session by access token
   */
  async findByAccessToken(accessToken: string): Promise<Session | null> {
    const prisma = await this.getPrisma();
    return await prisma.session.findUnique({
      where: { accessToken },
    });
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const prisma = await this.getPrisma();
    return await prisma.session.findUnique({
      where: { refreshToken },
    });
  }

  /**
   * Find all active sessions for a user
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    const prisma = await this.getPrisma();
    return await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    const prisma = await this.getPrisma();
    this.logger.debug(`Updating access token for session: ${id}`);

    return await prisma.session.update({
      where: { id },
      data: {
        accessToken,
        accessTokenExpiresAt,
      },
    });
  }

  /**
   * Invalidate a session (soft delete)
   */
  async invalidate(id: string): Promise<Session> {
    const prisma = await this.getPrisma();
    this.logger.log(`Invalidating session: ${id}`);

    return await prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllByUserId(userId: string): Promise<number> {
    const prisma = await this.getPrisma();
    this.logger.log(`Invalidating all sessions for user: ${userId}`);

    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    const prisma = await this.getPrisma();
    this.logger.debug('Deleting expired sessions');

    const result = await prisma.session.deleteMany({
      where: {
        refreshTokenExpiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Hard delete session
   */
  async delete(id: string): Promise<Session> {
    const prisma = await this.getPrisma();
    this.logger.warn(`Hard deleting session: ${id}`);

    return await prisma.session.delete({
      where: { id },
    });
  }
}
