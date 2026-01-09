import type { OAuthProviderType } from '@/db/schema';

/**
 * OAuth state data stored in database
 */
export interface OAuthStateData {
  /** OAuth provider */
  provider: OAuthProviderType;

  /** User ID (for link OAuth flow) */
  userId?: string;

  /** PKCE code verifier */
  codeVerifier: string;
}
