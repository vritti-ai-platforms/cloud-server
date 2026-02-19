import type { OAuthProviderType } from '@/db/schema';

export interface OAuthUserProfile {
  provider: OAuthProviderType;

  providerId: string;

  email: string;

  fullName?: string;

  displayName?: string;

  profilePictureUrl?: string;
}
