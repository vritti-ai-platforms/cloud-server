import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
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
        email: profile.email,
        displayName: profile.displayName,
        profilePictureUrl: profile.profilePictureUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });
    }

    // Create new provider
    return this.create({
      userId,
      provider: profile.provider as OAuthProvider['provider'],
      providerId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName,
      profilePictureUrl: profile.profilePictureUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    });
  }
}
