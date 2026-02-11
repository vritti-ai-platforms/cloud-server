import type { OAuthProviderType } from '@/db/schema';

export interface OAuthUserProfile {
  provider: OAuthProviderType;

  providerId: string;

  email: string;

  displayName?: string;

  firstName?: string;

  lastName?: string;

  profilePictureUrl?: string;
}
