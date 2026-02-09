import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { lt } from '@vritti/api-sdk/drizzle-orm';
import { type OAuthState, oauthStates } from '@/db/schema';

@Injectable()
export class OAuthStateRepository extends PrimaryBaseRepository<typeof oauthStates> {
  constructor(database: PrimaryDatabaseService) {
    super(database, oauthStates);
  }

  // Finds a state record by its signed token value
  async findByToken(token: string): Promise<OAuthState | undefined> {
    // Use object-based filter for Drizzle v2 relational API
    return this.findOne({ stateToken: token });
  }

  // Removes all expired state records from the database
  async deleteExpired(): Promise<{ count: number }> {
    return this.deleteMany(lt(oauthStates.expiresAt, new Date()));
  }
}
