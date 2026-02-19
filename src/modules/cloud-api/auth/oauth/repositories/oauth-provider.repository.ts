import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { type OAuthProvider, oauthProviders } from '@/db/schema';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

@Injectable()
export class OAuthProviderRepository extends PrimaryBaseRepository<typeof oauthProviders> {
  constructor(database: PrimaryDatabaseService) {
    super(database, oauthProviders);
  }

  // Finds an OAuth provider record by its type and external provider ID
  async findByProviderAndProviderId(
    provider: OAuthProvider['provider'],
    providerId: string,
  ): Promise<OAuthProvider | undefined> {
    return this.findOne({ provider, providerId });
  }

  // Returns all linked OAuth providers for a user
  async findByUserId(userId: string): Promise<OAuthProvider[]> {
    return this.findMany({
      where: { userId },
    });
  }

  // Removes all OAuth provider links for a user
  async deleteByUserId(userId: string): Promise<void> {
    await this.deleteMany(eq(oauthProviders.userId, userId));
  }

  // Creates or updates an OAuth provider link with fresh tokens and profile data
  async upsert(
    userId: string,
    profile: OAuthUserProfile,
    accessToken: string,
    refreshToken?: string,
    tokenExpiresAt?: Date,
  ): Promise<OAuthProvider> {
    // Find existing OAuth provider by unique constraint (provider + providerId)
    const existing = await this.findByProviderAndProviderId(
      profile.provider as OAuthProvider['provider'],
      profile.providerId,
    );

    if (existing) {
      // Update existing provider with new tokens and profile data
      return this.update(existing.id, {
        profilePictureUrl: profile.profilePictureUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });
    }

    // Check if user has any existing OAuth providers
    const existingProviders = await this.findByUserId(userId);
    const isFirstProvider = existingProviders.length === 0;

    // Create new provider - set useProfilePictureUrl=true only if first provider
    return this.create({
      userId,
      provider: profile.provider as OAuthProvider['provider'],
      providerId: profile.providerId,
      profilePictureUrl: profile.profilePictureUrl,
      useProfilePictureUrl: isFirstProvider,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    });
  }

  // Finds the OAuth provider marked as the active profile picture source for a user
  async findActiveProfilePictureProvider(userId: string): Promise<OAuthProvider | undefined> {
    return this.findOne({ userId, useProfilePictureUrl: true });
  }

  // Sets a specific provider as the active profile picture source (unsets all others for this user)
  async setActiveProfilePictureProvider(userId: string, providerId: string): Promise<void> {
    // First, set all providers for this user to false
    const allProviders = await this.findByUserId(userId);
    await Promise.all(
      allProviders.map((provider) =>
        this.update(provider.id, { useProfilePictureUrl: false }),
      ),
    );

    // Then set the target provider to true
    const targetProvider = allProviders.find((p) => p.id === providerId);
    if (targetProvider) {
      await this.update(targetProvider.id, { useProfilePictureUrl: true });
    }
  }
}
