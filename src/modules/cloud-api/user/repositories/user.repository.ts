import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { AccountStatusValues, OnboardingStepValues, type SignupMethod, SignupMethodValues, oauthProviders, type User, users } from '@/db/schema';

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

  // Finds a user by ID with their active OAuth profile picture URL
  async findByIdWithProfilePicture(id: string): Promise<
    | (User & { oauthProfilePictureUrl: string | null })
    | undefined
  > {
    this.logger.debug(`Finding user with profile picture: ${id}`);

    const result = await this.db
      .select({
        user: users,
        oauthProfilePictureUrl: oauthProviders.profilePictureUrl,
      })
      .from(users)
      .leftJoin(
        oauthProviders,
        eq(oauthProviders.userId, users.id) && eq(oauthProviders.useProfilePictureUrl, true),
      )
      .where(eq(users.id, id))
      .limit(1);

    if (!result || result.length === 0) return undefined;

    return {
      ...result[0].user,
      oauthProfilePictureUrl: result[0].oauthProfilePictureUrl || null,
    };
  }

  // Returns true if any user exists with this email (LIMIT 1 index lookup)
  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.model.findFirst({ where: { email } });
    return row !== undefined;
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

  // Updates the profile picture URL from OAuth provider
  async updateProfilePicture(id: string, profilePictureUrl: string | null): Promise<User> {
    this.logger.debug(`Updating profile picture for user: ${id}`);
    return this.update(id, { profilePictureUrl });
  }

  // Extracts first word from fullName for auto-deriving displayName
  private extractFirstWord(fullName: string): string {
    if (!fullName?.trim()) return fullName;
    return fullName.trim().split(/\s+/)[0];
  }

  // Derives a name from email when OAuth provider doesn't provide one
  private deriveNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart.replace(/[._-]/g, ' ').trim() || email;
  }

  // Creates a user from OAuth provider data without a password
  async createFromOAuth(data: {
    email: string;
    fullName?: string | null;
    displayName?: string | null;
    emailVerified?: boolean;
    onboardingStep?: (typeof users.$inferInsert)['onboardingStep'];
    profilePictureUrl?: string | null;
    signupMethod?: SignupMethod;
  }): Promise<User> {
    this.logger.log(`Creating user from OAuth: ${data.email}`);

    // Ensure fullName is always set - derive from email if not provided
    const fullName = data.fullName || this.deriveNameFromEmail(data.email);
    const displayName = data.displayName || this.extractFirstWord(fullName);

    return this.create({
      email: data.email,
      fullName,
      displayName,
      passwordHash: null, // OAuth users don't have password initially
      signupMethod: data.signupMethod ?? SignupMethodValues.OAUTH,
      emailVerified: data.emailVerified ?? false,
      onboardingStep: data.onboardingStep,
      profilePictureUrl: data.profilePictureUrl,
    });
  }

  // Soft deletes a user by setting accountStatus to INACTIVE
  async softDelete(id: string): Promise<User> {
    this.logger.log(`Soft deleting user: ${id}`);
    return this.update(id, { accountStatus: AccountStatusValues.INACTIVE });
  }

  // Permanently removes a user record from the database
  async hardDelete(id: string): Promise<void> {
    this.logger.log(`Hard deleting user: ${id}`);
    await this.delete(id);
  }
}
