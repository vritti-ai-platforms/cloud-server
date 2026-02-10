import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { type OAuthProviderType, OAuthProviderTypeValues, OnboardingStepValues, type User } from '@/db/schema';

function validateProviderString(providerStr: string): OAuthProviderType {
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

import { getTokenExpiry, TokenType } from '../../../../../config/jwt.config';
import { UserRepository } from '../../../user/repositories/user.repository';
import { OAuthResponseDto } from '../dto/response/oauth-response.dto';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import type { OAuthTokens } from '../interfaces/oauth-tokens.interface';
import type { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';
import { AppleOAuthProvider } from '../providers/apple-oauth.provider';
import { FacebookOAuthProvider } from '../providers/facebook-oauth.provider';
import { GoogleOAuthProvider } from '../providers/google-oauth.provider';
import { MicrosoftOAuthProvider } from '../providers/microsoft-oauth.provider';
import { TwitterOAuthProvider } from '../providers/twitter-oauth.provider';
import { OAuthProviderRepository } from '../repositories/oauth-provider.repository';
import { OAuthStateService } from './oauth-state.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly tokenExpiry: ReturnType<typeof getTokenExpiry>;
  private readonly providers: Map<OAuthProviderType, IOAuthProvider>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly oauthStateService: OAuthStateService,
    private readonly oauthProviderRepository: OAuthProviderRepository,
    private readonly jwtService: JwtService,
    readonly configService: ConfigService,
    // Inject all OAuth providers
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly microsoftProvider: MicrosoftOAuthProvider,
    private readonly appleProvider: AppleOAuthProvider,
    private readonly facebookProvider: FacebookOAuthProvider,
    private readonly twitterProvider: TwitterOAuthProvider,
  ) {
    this.tokenExpiry = getTokenExpiry(configService);

    // Map provider types to implementations
    // Use type assertion to bypass structural typing issues with private logger properties
    this.providers = new Map([
      [OAuthProviderTypeValues.GOOGLE, this.googleProvider],
      [OAuthProviderTypeValues.MICROSOFT, this.microsoftProvider],
      [OAuthProviderTypeValues.APPLE, this.appleProvider],
      [OAuthProviderTypeValues.FACEBOOK, this.facebookProvider],
      [OAuthProviderTypeValues.X, this.twitterProvider],
    ] as [OAuthProviderType, IOAuthProvider][]);
  }

  // Generates an authorization URL with PKCE and state, then stores the state in DB
  async initiateOAuth(providerStr: string, userId?: string): Promise<{ url: string; state: string }> {
    const provider = validateProviderString(providerStr);
    const oauthProvider = this.getProvider(provider);

    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Generate and store state token
    const state = await this.oauthStateService.generateState(provider, userId, codeVerifier);

    // Get authorization URL from provider
    const url = oauthProvider.getAuthorizationUrl(state, codeChallenge);

    this.logger.log(`Initiated OAuth flow for provider: ${provider}, userId: ${userId || 'none'}`);

    return { url, state };
  }

  // Exchanges the authorization code for tokens, finds or creates the user, and links the provider
  async handleCallback(providerStr: string, code: string, state: string): Promise<OAuthResponseDto> {
    const provider = validateProviderString(providerStr);

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

    // Find or create user
    const { user, isNewUser } = await this.findOrCreateUser(profile, stateData.userId);

    // Link OAuth provider to user
    await this.linkOAuthProvider(user.id, profile, tokens);

    // Generate onboarding token
    const onboardingToken = this.generateOnboardingToken(user.id);

    this.logger.log(`OAuth callback completed for provider: ${provider}, user: ${user.email}, isNewUser: ${isNewUser}`);

    return OAuthResponseDto.create(onboardingToken, user, isNewUser);
  }

  private async findOrCreateUser(
    profile: OAuthUserProfile,
    linkToUserId?: string,
  ): Promise<{ user: User; isNewUser: boolean }> {
    // If linkToUserId provided, link to existing user
    // Use repository directly to get full User type (service returns UserDto)
    if (linkToUserId) {
      const user = await this.userRepository.findById(linkToUserId);
      if (!user) {
        throw new BadRequestException("We couldn't find your account. Please check your information or register.");
      }
      return { user, isNewUser: false };
    }

    // Check if user with email exists (returns full User type)
    const existingUser = await this.userRepository.findByEmail(profile.email);

    if (existingUser) {
      // Allow OAuth signin for both incomplete and completed users
      // For completed users: OAuth provider will be linked, CLOUD session created, redirected to dashboard
      // For incomplete users: OAuth provider will be linked, ONBOARDING session created, redirected to onboarding
      this.logger.log(
        `Found existing user for email: ${profile.email}, onboardingStep: ${existingUser.onboardingStep}`,
      );
      return { user: existingUser, isNewUser: false };
    }

    // Create new user
    this.logger.log(`Creating new user from OAuth profile: ${profile.email}`);

    // For OAuth users, we use a dedicated repository method
    // since CreateUserDto requires a password field that OAuth users don't have
    const newUser = await this.userRepository.createFromOAuth({
      email: profile.email,
      firstName: profile.firstName || null,
      lastName: profile.lastName || null,
      emailVerified: true, // Email verified by OAuth provider
      onboardingStep: OnboardingStepValues.SET_PASSWORD,
      profilePictureUrl: profile.profilePictureUrl || null,
    });

    return { user: newUser, isNewUser: true };
  }

  private async linkOAuthProvider(userId: string, profile: OAuthUserProfile, tokens: OAuthTokens): Promise<void> {
    // Calculate token expiry
    const tokenExpiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined;

    await this.oauthProviderRepository.upsert(userId, profile, tokens.accessToken, tokens.refreshToken, tokenExpiresAt);

    this.logger.log(`Linked OAuth provider: ${profile.provider} to user: ${userId}`);
  }

  private generateOnboardingToken(userId: string): string {
    return this.jwtService.sign(
      {
        userId,
        tokenType: TokenType.ACCESS,
      },
      {
        expiresIn: this.tokenExpiry.access,
      },
    );
  }

  private getProvider(provider: OAuthProviderType): IOAuthProvider {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new BadRequestException('The selected login method is not available. Please choose a different option.');
    }
    return oauthProvider;
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}
