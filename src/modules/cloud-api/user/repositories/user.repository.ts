import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, type User, users } from '@/db/schema';

@Injectable()
export class UserRepository extends PrimaryBaseRepository<typeof users> {
  constructor(database: PrimaryDatabaseService) {
    super(database, users);
  }

  // Retrieves all users ordered by creation date descending
  async findAll(): Promise<User[]> {
    this.logger.debug('Finding all users');
    return this.model.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Finds a user by email address
  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.model.findFirst({
      where: { email },
    });
  }

  // Finds a user by phone number
  async findByPhone(phone: string): Promise<User | undefined> {
    this.logger.debug(`Finding user by phone: ${phone}`);
    return this.model.findFirst({
      where: { phone },
    });
  }

  // Updates the last login timestamp for a user
  async updateLastLogin(id: string): Promise<User> {
    this.logger.debug(`Updating last login for user: ${id}`);
    return this.update(id, { lastLoginAt: new Date() });
  }

  // Sets emailVerified to true and records the verification timestamp
  async markEmailVerified(id: string): Promise<User> {
    this.logger.log(`Marking email verified for user: ${id}`);
    return this.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  // Sets phone as verified with the given number and country
  async markPhoneVerified(id: string, phone: string, phoneCountry: string): Promise<User> {
    this.logger.log(`Marking phone verified for user: ${id}`);
    return this.update(id, {
      phone,
      phoneCountry,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    });
  }

  // Sets password hash and advances onboarding to MOBILE_VERIFICATION
  async setPasswordHash(id: string, passwordHash: string): Promise<User> {
    this.logger.log(`Setting password for user: ${id}`);
    return this.update(id, {
      passwordHash,
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });
  }

  // Marks phone as verified and sets onboarding to COMPLETE, skipping MFA
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

  // Marks phone as verified and advances onboarding to TWO_FACTOR_SETUP
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

  // Creates a user from OAuth provider data without a password
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

  // Soft deletes a user by setting accountStatus to INACTIVE
  async delete(id: string): Promise<User> {
    this.logger.log(`Deactivating user: ${id}`);
    return this.update(id, { accountStatus: AccountStatusValues.INACTIVE });
  }
}
