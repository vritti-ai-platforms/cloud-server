import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import {
  type OAuthProviderType,
  OAuthProviderTypeValues,
  OnboardingStepValues,
  SessionTypeValues,
  type User,
} from '@/db/schema';
import { UserRepository } from '../../../user/repositories/user.repository';
import { SessionService } from '../../root/services/session.service';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import { AppleOAuthProvider } from '../providers/apple-oauth.provider';
import { FacebookOAuthProvider } from '../providers/facebook-oauth.provider';
import { GoogleOAuthProvider } from '../providers/google-oauth.provider';
import { MicrosoftOAuthProvider } from '../providers/microsoft-oauth.provider';
import { TwitterOAuthProvider } from '../providers/twitter-oauth.provider';
import { OAuthProviderRepository } from '../repositories/oauth-provider.repository';
import { OAuthCryptoService } from './oauth-crypto.service';
import { OAuthStateService } from './oauth-state.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly providers: Map<OAuthProviderType, IOAuthProvider>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly oauthStateService: OAuthStateService,
    private readonly oauthProviderRepository: OAuthProviderRepository,
    private readonly oauthCryptoService: OAuthCryptoService,
    private readonly sessionService: SessionService,
    readonly configService: ConfigService,
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly microsoftProvider: MicrosoftOAuthProvider,
    private readonly appleProvider: AppleOAuthProvider,
    private readonly facebookProvider: FacebookOAuthProvider,
    private readonly twitterProvider: TwitterOAuthProvider,
  ) {
    this.providers = new Map([
      [OAuthProviderTypeValues.GOOGLE, this.googleProvider],
      [OAuthProviderTypeValues.MICROSOFT, this.microsoftProvider],
      [OAuthProviderTypeValues.APPLE, this.appleProvider],
      [OAuthProviderTypeValues.FACEBOOK, this.facebookProvider],
      [OAuthProviderTypeValues.X, this.twitterProvider],
    ] as [OAuthProviderType, IOAuthProvider][]);
  }

  // Generates an authorization URL with PKCE and state, then stores the state in DB
  async initiateOAuth(providerStr: string): Promise<{ url: string }> {
    const provider = this.validateProviderString(providerStr);
    const oauthProvider = this.getProvider(provider);

    // Generate PKCE code verifier and challenge
    const codeVerifier = this.oauthCryptoService.generateCodeVerifier();
    const codeChallenge = this.oauthCryptoService.generateCodeChallenge(codeVerifier);

    // Generate and store state token
    const state = await this.oauthStateService.generateState(provider, undefined, codeVerifier);

    // Get authorization URL from provider
    const url = oauthProvider.getAuthorizationUrl(state, codeChallenge);

    this.logger.log(`Initiated OAuth flow for provider: ${provider}`);

    return { url };
  }

  // Exchanges code for tokens, creates session, and returns redirect URL with refresh token
  async handleCallback(
    providerStr: string,
    code: string | undefined,
    state: string,
    error?: string,
    errorDescription?: string,
  ): Promise<{ redirectUrl: string; refreshToken: string }> {
    try {
      // Check for OAuth error response (user cancelled or provider error)
      if (error) {
        this.logger.warn(`OAuth error: ${error} - ${errorDescription || 'No description'}`);
        const baseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');

        // Normalize error message for user cancellation
        const normalizedDescription = error === 'access_denied'
          ? 'You cancelled the authentication process. Please try again if you want to continue.'
          : (errorDescription || 'Authentication failed. Please try again.');

        const params = new URLSearchParams({
          error,
          error_description: normalizedDescription
        });
        const redirectUrl = `${baseUrl}/auth-error?${params.toString()}`;
        return { redirectUrl, refreshToken: '' };
      }

      // Code is required if no error
      if (!code) {
        throw new BadRequestException('Authorization code is required.');
      }

      const provider = this.validateProviderString(providerStr);

      // Validate and consume state token
      const stateData = await this.oauthStateService.validateAndConsumeState(state);

      // Verify provider matches
      if (stateData.provider !== provider) {
        throw new UnauthorizedException(
          'The authentication provider does not match your request. Please try logging in again.',
        );
      }

      const oauthProvider = this.getProvider(provider);

      // Exchange code for tokens
      const tokens = await oauthProvider.exchangeCodeForToken(code, stateData.codeVerifier);

      // Get user profile from provider
      const profile = await oauthProvider.getUserProfile(tokens.accessToken);

      // Check if user with email exists
      const existingUser = await this.userRepository.findByEmail(profile.email);
      let user: User;
      let isNewUser: boolean;

      if (existingUser) {
        // Completed onboarding — link provider and continue
        if (existingUser.onboardingStep === OnboardingStepValues.COMPLETE) {
          this.logger.log(`Found existing user for email: ${profile.email}, linking OAuth provider`);
          user = existingUser;
          isNewUser = false;
        } else {
          // Incomplete onboarding — delete and start fresh
          await this.oauthProviderRepository.deleteByUserId(existingUser.id);
          await this.userRepository.hardDelete(existingUser.id);
          this.logger.log(`Deleted incomplete user for re-signup: ${profile.email} (${existingUser.id})`);

          // Create new user
          this.logger.log(`Creating new user from OAuth profile: ${profile.email}`);
          user = await this.userRepository.createFromOAuth({
            email: profile.email,
            firstName: profile.firstName || null,
            lastName: profile.lastName || null,
            emailVerified: true,
            onboardingStep: OnboardingStepValues.SET_PASSWORD,
            profilePictureUrl: profile.profilePictureUrl || null,
          });
          isNewUser = true;
        }
      } else {
        // Create new user
        this.logger.log(`Creating new user from OAuth profile: ${profile.email}`);
        user = await this.userRepository.createFromOAuth({
          email: profile.email,
          firstName: profile.firstName || null,
          lastName: profile.lastName || null,
          emailVerified: true,
          onboardingStep: OnboardingStepValues.SET_PASSWORD,
          profilePictureUrl: profile.profilePictureUrl || null,
        });
        isNewUser = true;
      }

      // Link OAuth provider to user
      const tokenExpiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined;
      await this.oauthProviderRepository.upsert(user.id, profile, tokens.accessToken, tokens.refreshToken, tokenExpiresAt);
      this.logger.log(`Linked OAuth provider: ${profile.provider} to user: ${user.id}`);

      // Determine session type based on onboarding status
      const isFullyOnboarded = user.onboardingStep === OnboardingStepValues.COMPLETE;
      const sessionType = isFullyOnboarded ? SessionTypeValues.CLOUD : SessionTypeValues.ONBOARDING;

      // Create session
      const session = await this.sessionService.createSession(user.id, sessionType);

      // Build frontend redirect URL based on onboarding status
      const baseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
      const redirectUrl = isFullyOnboarded
        ? baseUrl // Complete users → dashboard
        : `${baseUrl}/auth-success?email=${encodeURIComponent(user.email)}`; // Incomplete users → auth-success

      this.logger.log(`OAuth callback completed for user: ${user.email}, isNewUser: ${isNewUser}, redirecting to: ${isFullyOnboarded ? 'dashboard' : 'auth-success'}`);

      return { redirectUrl, refreshToken: session.refreshToken };
    } catch (error) {
      this.logger.error('OAuth callback error', error);
      const baseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
      const params = new URLSearchParams({ error: error.message });
      const redirectUrl = `${baseUrl}/auth-error?${params.toString()}`;
      return { redirectUrl, refreshToken: '' };
    }
  }

  private validateProviderString(providerStr: string): OAuthProviderType {
    const upperProvider = providerStr.toUpperCase();

    if (!Object.values(OAuthProviderTypeValues).includes(upperProvider as OAuthProviderType)) {
      throw new BadRequestException({
        label: 'Invalid Provider',
        detail: 'The selected login method is not supported. Please choose a different option.',
        errors: [{ field: 'provider', message: 'Unsupported provider' }],
      });
    }

    return upperProvider as OAuthProviderType;
  }

  private getProvider(provider: OAuthProviderType): IOAuthProvider {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new BadRequestException('The selected login method is not available. Please choose a different option.');
    }
    return oauthProvider;
  }
}
