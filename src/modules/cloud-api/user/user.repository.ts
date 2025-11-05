import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly database: PrimaryDatabaseService) {}

  /**
   * Get Prisma client for user database
   */
  private async getPrisma(): Promise<PrismaClient> {
    return await this.database.getPrimaryDbClient<PrismaClient>();
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto & { passwordHash?: string }): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.log(`Creating user: ${data.email}`);

    return await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    const prisma = await this.getPrisma();
    this.logger.debug('Finding all users');

    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Finding user by ID: ${id}`);

    return await prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Finding user by email: ${email}`);

    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<User | null> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Finding user by phone: ${phone}`);

    return await prisma.user.findFirst({
      where: { phone },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto & { passwordHash?: string }): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.log(`Updating user: ${id}`);

    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Updating last login for user: ${id}`);

    return await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Mark email as verified
   */
  async markEmailVerified(id: string): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.log(`Marking email verified for user: ${id}`);

    return await prisma.user.update({
      where: { id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  /**
   * Mark phone as verified
   */
  async markPhoneVerified(id: string, phone: string, phoneCountry: string): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.log(`Marking phone verified for user: ${id}`);

    return await prisma.user.update({
      where: { id },
      data: {
        phone,
        phoneCountry,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    });
  }

  /**
   * Delete user (soft delete by setting status to DEACTIVATED)
   */
  async delete(id: string): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.log(`Deactivating user: ${id}`);

    return await prisma.user.update({
      where: { id },
      data: { accountStatus: 'DEACTIVATED' },
    });
  }

  /**
   * Hard delete user (permanently remove from database)
   * Use with caution!
   */
  async hardDelete(id: string): Promise<User> {
    const prisma = await this.getPrisma();
    this.logger.warn(`Hard deleting user: ${id}`);

    return await prisma.user.delete({
      where: { id },
    });
  }
}
