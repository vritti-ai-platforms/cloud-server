import { Injectable } from '@nestjs/common';
import {
  PrimaryBaseRepository,
  PrimaryDatabaseService,
} from '@vritti/api-sdk';
import { eq, desc, and } from '@vritti/api-sdk/drizzle-orm';
import { users, User } from '@/db/schema';

@Injectable()
export class UserRepository extends PrimaryBaseRepository<typeof users> {
  constructor(database: PrimaryDatabaseService) {
    super(database, users);
  }

  /**
   * Find all users (with custom ordering)
   */
  async findAll(): Promise<User[]> {
    this.logger.debug('Finding all users');
    return this.model.findMany({
      orderBy: desc(users.createdAt),
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.model.findFirst({
      where: eq(users.email, email),
    });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by phone: ${phone}`);
    return this.model.findFirst({
      where: eq(users.phone, phone),
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<User> {
    this.logger.debug(`Updating last login for user: ${id}`);
    return this.update(id, { lastLoginAt: new Date() });
  }

  /**
   * Mark email as verified
   */
  async markEmailVerified(id: string): Promise<User> {
    this.logger.log(`Marking email verified for user: ${id}`);
    return this.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  /**
   * Mark phone as verified
   */
  async markPhoneVerified(
    id: string,
    phone: string,
    phoneCountry: string,
  ): Promise<User> {
    this.logger.log(`Marking phone verified for user: ${id}`);
    return this.update(id, {
      phone,
      phoneCountry,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    });
  }

  /**
   * Create user from OAuth profile
   * This method allows creating a user with OAuth-specific fields that aren't in CreateUserDto
   */
  async createFromOAuth(data: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: boolean;
    onboardingStep?: typeof users.$inferInsert['onboardingStep'];
    profilePictureUrl?: string | null;
  }): Promise<User> {
    this.logger.log(`Creating user from OAuth: ${data.email}`);
    return this.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: null, // OAuth users don't have password initially
      emailVerified: data.emailVerified ?? false,
      onboardingStep: data.onboardingStep,
      profilePictureUrl: data.profilePictureUrl,
    });
  }

  /**
   * Delete user (soft delete by setting status to DEACTIVATED)
   *
   * This method performs a soft delete by changing the account status rather than
   * removing the record from the database. For hard delete (permanent removal),
   * use the inherited base repository delete() method directly on the model.
   *
   * Note: This overrides the base repository's delete() method to implement
   * soft delete behavior specific to the User entity.
   */
  async delete(id: string): Promise<User> {
    this.logger.log(`Deactivating user: ${id}`);
    return this.update(id, { accountStatus: 'DEACTIVATED' });
  }
}
