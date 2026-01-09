import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { lt } from '@vritti/api-sdk/drizzle-orm';
import { type OAuthState, oauthStates } from '@/db/schema';

/**
 * OAuth State Repository
 * CRUD operations for OAuthState model
 *
 * Manages OAuth state tokens stored in the primary database
 * Used for CSRF protection during OAuth flows
 */
@Injectable()
export class OAuthStateRepository extends PrimaryBaseRepository<typeof oauthStates> {
  constructor(database: PrimaryDatabaseService) {
    super(database, oauthStates);
  }

  /**
   * Find OAuth state by state token
   * @param token - The signed state token
   * @returns OAuthState record or undefined if not found
   */
  async findByToken(token: string): Promise<OAuthState | undefined> {
    // Use object-based filter for Drizzle v2 relational API
    return this.findOne({ stateToken: token });
  }

  /**
   * Delete expired OAuth states
   * @returns Object containing count of deleted records
   */
  async deleteExpired(): Promise<{ count: number }> {
    return this.deleteMany(lt(oauthStates.expiresAt, new Date()));
  }
}
