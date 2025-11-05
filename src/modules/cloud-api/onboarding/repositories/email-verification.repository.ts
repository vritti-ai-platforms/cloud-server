import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, EmailVerification } from '@prisma/client';
import { PrimaryDatabaseService } from '@vritti/api-sdk';

@Injectable()
export class EmailVerificationRepository {
  private readonly logger = new Logger(EmailVerificationRepository.name);

  constructor(private readonly database: PrimaryDatabaseService) {}

  /**
   * Get Prisma client for email verification database
   */
  private async getPrisma(): Promise<PrismaClient> {
    return await this.database.getPrimaryDbClient<PrismaClient>();
  }

  /**
   * Create a new email verification record
   */
  async create(data: {
    userId: string;
    email: string;
    otp: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    const prisma = await this.getPrisma();
    this.logger.log(`Creating email verification for user: ${data.userId}`);

    return await prisma.emailVerification.create({
      data: {
        userId: data.userId,
        email: data.email,
        otp: data.otp,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find the most recent non-verified email verification for a user
   */
  async findLatestByUserId(userId: string): Promise<EmailVerification | null> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Finding latest email verification for user: ${userId}`);

    return await prisma.emailVerification.findFirst({
      where: {
        userId,
        isVerified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find email verification by ID
   */
  async findById(id: string): Promise<EmailVerification | null> {
    const prisma = await this.getPrisma();
    return await prisma.emailVerification.findUnique({
      where: { id },
    });
  }

  /**
   * Increment failed verification attempts
   */
  async incrementAttempts(id: string): Promise<EmailVerification> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Incrementing attempts for email verification: ${id}`);

    return await prisma.emailVerification.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Mark email verification as verified
   */
  async markAsVerified(id: string): Promise<EmailVerification> {
    const prisma = await this.getPrisma();
    this.logger.log(`Marking email verification as verified: ${id}`);

    return await prisma.emailVerification.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Delete all email verifications for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Deleting email verifications for user: ${userId}`);

    await prisma.emailVerification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete expired email verifications
   */
  async deleteExpired(): Promise<number> {
    const prisma = await this.getPrisma();
    this.logger.debug('Deleting expired email verifications');

    const result = await prisma.emailVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isVerified: false,
      },
    });

    return result.count;
  }
}
