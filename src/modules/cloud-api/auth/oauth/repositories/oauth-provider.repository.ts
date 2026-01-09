import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type OAuthProvider, oauthProviders } from '@/db/schema';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

/**
 * OAuth Provider Repository
 * CRUD operations for OAuthProvider model
 *
 * For simple queries, use inherited methods from PrimaryBaseRepository:
 * - findOne(where)
 * - findMany({ where })
 * - delete(id)
 * - deleteMany(where)
 */
@Injectable()
export class OAuthProviderRepository extends PrimaryBaseRepository<typeof oauthProviders> {
  constructor(database: PrimaryDatabaseService) {
    super(database, oauthProviders);
  }

  /**
   * Find OAuth provider by provider type and provider ID
   */
  async findByProviderAndProviderId(
    provider: OAuthProvider['provider'],
    providerId: string,
  ): Promise<OAuthProvider | undefined> {
    return this.findOne(and(eq(oauthProviders.provider, provider), eq(oauthProviders.providerId, providerId))!);
  }

  /**
   * Find all OAuth providers for a user
   */
  async findByUserId(userId: string): Promise<OAuthProvider[]> {
    return this.findMany({
      where: eq(oauthProviders.userId, userId),
    });
  }

  /**
   * Create or update OAuth provider
   * If provider already exists (by provider + providerId), update tokens and metadata
   * Otherwise, create a new OAuth provider record
   *
   * @param userId - The user ID to link the OAuth provider to
   * @param profile - OAuth user profile data from the provider
   * @param accessToken - OAuth access token
   * @param refreshToken - Optional OAuth refresh token
   * @param tokenExpiresAt - Optional token expiration date
   * @returns The created or updated OAuthProvider record
   */
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
