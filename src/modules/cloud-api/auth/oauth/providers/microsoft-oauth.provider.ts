import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OAuthProviderTypeValues } from '@/db/schema';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import type { OAuthTokenExchangePayload, OAuthTokens } from '../interfaces/oauth-tokens.interface';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

interface MicrosoftUserInfo {
  '@odata.context': string;
  userPrincipalName: string;
  id: string;
  displayName: string;
  surname: string;
  givenName: string;
  preferredLanguage: string;
  mail: string | null;
  mobilePhone: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
  businessPhones: string[];
}

@Injectable()
export class MicrosoftOAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(MicrosoftOAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly AUTHORIZATION_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  private readonly TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  private readonly USER_INFO_URL = 'https://graph.microsoft.com/v1.0/me';
  private readonly PHOTO_URL = 'https://graph.microsoft.com/v1.0/me/photo/$value';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('MICROSOFT_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('MICROSOFT_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('MICROSOFT_CALLBACK_URL');
  }

  // Extracts first word from fullName for auto-deriving displayName
  private extractFirstWord(fullName: string): string {
    if (!fullName?.trim()) return fullName;
    return fullName.trim().split(/\s+/)[0];
  }

  // Fetches the user's profile photo from Microsoft Graph API and converts to data URL
  private async fetchProfilePhoto(accessToken: string): Promise<string | undefined> {
    try {
      const response = await axios.get(this.PHOTO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      // Convert binary data to base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const contentType = response.headers['content-type'] || 'image/jpeg';

      this.logger.debug('Successfully fetched Microsoft profile photo');
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      // 404 is expected when user has no profile photo - don't log as error
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.debug('No profile photo available for Microsoft user');
        return undefined;
      }

      // Log unexpected errors
      this.logger.warn('Unexpected error fetching Microsoft profile photo', error);
      return undefined;
    }
  }

  // Builds the Microsoft OAuth authorization URL with PKCE support
  getAuthorizationUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      state,
      response_mode: 'query',
    });

    // Add PKCE if code challenge provided
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const url = `${this.AUTHORIZATION_URL}?${params.toString()}`;
    this.logger.debug('Generated Microsoft authorization URL');
    return url;
  }

  // Exchanges the authorization code for Microsoft access and refresh tokens
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const data: OAuthTokenExchangePayload = {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      };

      const response = await axios.post(this.TOKEN_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.logger.log('Successfully exchanged Microsoft authorization code');

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        idToken: response.data.id_token,
      };
    } catch (error) {
      this.logger.error('Failed to exchange Microsoft authorization code', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Fetches the user's profile from Microsoft Graph API using the access token
  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await axios.get<MicrosoftUserInfo>(this.USER_INFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data: MicrosoftUserInfo = response.data;

      this.logger.log(`Retrieved Microsoft profile for user: ${data.userPrincipalName}`);

      const fullName = data.displayName || '';
      const displayName = data.givenName || this.extractFirstWord(fullName) || '';

      // Fetch profile photo (returns undefined if not available)
      const profilePictureUrl = await this.fetchProfilePhoto(accessToken);

      return {
        provider: OAuthProviderTypeValues.MICROSOFT,
        providerId: data.id,
        email: data.userPrincipalName || data.mail || '',
        fullName,
        displayName,
        profilePictureUrl,
      };
    } catch (error) {
      this.logger.error('Failed to get Microsoft user profile', error);
      throw new Error('Failed to get user profile');
    }
  }
}
