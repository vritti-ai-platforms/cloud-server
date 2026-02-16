import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OAuthProviderTypeValues } from '@/db/schema';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import type { OAuthTokenExchangePayload, OAuthTokens } from '../interfaces/oauth-tokens.interface';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

interface TwitterUserInfo {
  id: string;
  confirmed_email: string;
  profile_image_url: string;
  name: string;
  username: string;
}

@Injectable()
export class TwitterOAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(TwitterOAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly AUTHORIZATION_URL = 'https://twitter.com/i/oauth2/authorize';
  private readonly TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
  private readonly USER_INFO_URL = 'https://api.twitter.com/2/users/me';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('X_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('X_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('X_CALLBACK_URL');
  }

  // Extracts first word from fullName for auto-deriving displayName
  private extractFirstWord(fullName: string): string {
    if (!fullName?.trim()) return fullName;
    return fullName.trim().split(/\s+/)[0];
  }

  // Builds the X (Twitter) OAuth 2.0 authorization URL with required PKCE
  getAuthorizationUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'tweet.read users.read offline.access users.email',
      state,
    });

    // Twitter OAuth 2.0 requires PKCE
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    } else {
      this.logger.warn('Twitter OAuth 2.0 requires PKCE, but no code challenge provided');
    }

    const url = `${this.AUTHORIZATION_URL}?${params.toString()}`;
    this.logger.debug('Generated X (Twitter) authorization URL');
    return url;
  }

  // Exchanges the authorization code for X (Twitter) tokens using Basic Auth
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    try {
      // Twitter uses Basic Auth header for client authentication
      const data: Omit<OAuthTokenExchangePayload, 'client_secret'> = {
        code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      };

      // Twitter OAuth 2.0 requires PKCE
      if (!codeVerifier) {
        this.logger.warn('Twitter OAuth 2.0 requires PKCE, but no code verifier provided');
      }

      // Create Basic Auth header
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.TOKEN_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      });

      this.logger.log('Successfully exchanged X (Twitter) authorization code');

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to exchange X (Twitter) authorization code', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Fetches the user's profile from X (Twitter) API v2 using the access token
  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await axios.get<{ data: TwitterUserInfo }>(this.USER_INFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          'user.fields': 'profile_image_url,name,username,confirmed_email',
        },
      });

      const data: TwitterUserInfo = response.data.data;

      this.logger.log(`Retrieved X (Twitter) profile for user: ${data.username}`);

      const fullName = data.name || '';
      const displayName = this.extractFirstWord(fullName) || '';

      return {
        provider: OAuthProviderTypeValues.X,
        providerId: data.id,
        email: data.confirmed_email || '',
        fullName,
        displayName,
        profilePictureUrl: data.profile_image_url,
      };
    } catch (error) {
      this.logger.error('Failed to get X (Twitter) user profile', error);
      throw new Error('Failed to get user profile');
    }
  }
}
