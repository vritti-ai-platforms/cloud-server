import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, type User, users } from '@/db/schema';

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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find user by email (Drizzle v2 object-based where)
   */
  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.model.findFirst({
      where: { email },
    });
  }

  /**
   * Find user by phone (Drizzle v2 object-based where)
   */
  async findByPhone(phone: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by phone: ${phone}`);
    return this.model.findFirst({
      where: { phone },
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
  async markPhoneVerified(id: string, phone: string, phoneCountry: string): Promise<User> {
    this.logger.log(`Marking phone verified for user: ${id}`);
    return this.update(id, {
      phone,
      phoneCountry,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    });
  }

  /**
   * Set password hash for OAuth users and advance onboarding step
   * Used during onboarding when OAuth user sets their password
   *
   * @param id User ID
   * @param passwordHash Hashed password
   */
  async setPasswordHash(id: string, passwordHash: string): Promise<User> {
    this.logger.log(`Setting password for user: ${id}`);
    return this.update(id, {
      passwordHash,
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });
  }

  /**
   * Complete onboarding - marks phone as verified and sets onboarding step to COMPLETE
   * Used after mobile verification to skip MFA and complete onboarding
   *
   * @param id User ID
   * @param phone Verified phone number
   * @param phoneCountry Phone country code (optional for QR-based verification where country is not known)
   */
  async completeOnboarding(id: string, phone: string, phoneCountry?: string): Promise<User> {
    this.logger.log(`Completing onboarding for user: ${id}`);
    return this.update(id, {
      phone,
      ...(phoneCountry ? { phoneCountry } : {}),
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      onboardingStep: OnboardingStepValues.COMPLETE,
    });
  }

  /**
   * Mark phone as verified and advance to MFA setup step
   * Used after mobile verification - user still needs to complete MFA setup
   *
   * @param id User ID
   * @param phone Verified phone number
   * @param phoneCountry Phone country code (optional for QR-based verification)
   */
  async markPhoneVerifiedAndAdvanceToMfa(id: string, phone: string, phoneCountry?: string): Promise<User> {
    this.logger.log(`Marking phone verified and advancing to MFA for user: ${id}`);
    return this.update(id, {
      phone,
      ...(phoneCountry ? { phoneCountry } : {}),
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      onboardingStep: OnboardingStepValues.TWO_FACTOR_SETUP,
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
    onboardingStep?: (typeof users.$inferInsert)['onboardingStep'];
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
   * Delete user (soft delete by setting status to INACTIVE)
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
    return this.update(id, { accountStatus: AccountStatusValues.INACTIVE });
  }
}
