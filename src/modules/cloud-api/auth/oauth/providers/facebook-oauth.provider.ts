import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OAuthProviderTypeValues } from '@/db/schema';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import type { FacebookTokenParams, OAuthTokens } from '../interfaces/oauth-tokens.interface';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

interface FacebookUserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  picture?: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
}

@Injectable()
export class FacebookOAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(FacebookOAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly AUTHORIZATION_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
  private readonly TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private readonly USER_INFO_URL = 'https://graph.facebook.com/v18.0/me';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('META_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('META_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('FACEBOOK_CALLBACK_URL');
  }

  // Extracts first word from fullName for auto-deriving displayName
  private extractFirstWord(fullName: string): string {
    if (!fullName?.trim()) return fullName;
    return fullName.trim().split(/\s+/)[0];
  }

  // Builds the Facebook OAuth dialog URL with PKCE support
  getAuthorizationUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'email public_profile',
      state,
    });

    // Add PKCE if code challenge provided
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const url = `${this.AUTHORIZATION_URL}?${params.toString()}`;
    this.logger.debug('Generated Facebook authorization URL');
    return url;
  }

  // Exchanges the authorization code for a Facebook access token
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const params: FacebookTokenParams = {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      };

      const response = await axios.get(this.TOKEN_URL, { params });

      this.logger.log('Successfully exchanged Facebook authorization code');

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to exchange Facebook authorization code', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Fetches the user's profile from Facebook Graph API using the access token
  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await axios.get<FacebookUserInfo>(this.USER_INFO_URL, {
        params: {
          fields: 'id,email,first_name,last_name,name,picture',
          access_token: accessToken,
        },
      });

      const data: FacebookUserInfo = response.data;

      this.logger.log(`Retrieved Facebook profile for user: ${data.email}`);

      const fullName = data.name || '';
      const displayName = data.first_name || this.extractFirstWord(fullName) || '';

      return {
        provider: OAuthProviderTypeValues.FACEBOOK,
        providerId: data.id,
        email: data.email,
        fullName,
        displayName,
        profilePictureUrl: data.picture?.data?.url,
      };
    } catch (error) {
      this.logger.error('Failed to get Facebook user profile', error);
      throw new Error('Failed to get user profile');
    }
  }
}
