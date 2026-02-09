import type { OAuthProviderType } from '@/db/schema';

export interface OAuthStateData {
  provider: OAuthProviderType;

  userId?: string;

  codeVerifier: string;
}
