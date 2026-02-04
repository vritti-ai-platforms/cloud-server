import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller';
import { AuthOAuthController } from './controllers/auth-oauth.controller';
import { PasskeyAuthController } from './controllers/passkey-auth.controller';
import { MfaVerificationModule } from './mfa-verification/mfa-verification.module';
import { AppleOAuthProvider } from './oauth/apple-oauth.provider';
import { FacebookOAuthProvider } from './oauth/facebook-oauth.provider';
import { GoogleOAuthProvider } from './oauth/google-oauth.provider';
import { MicrosoftOAuthProvider } from './oauth/microsoft-oauth.provider';
import { OAuthProviderRepository } from './oauth/repositories/oauth-provider.repository';
import { OAuthStateRepository } from './oauth/repositories/oauth-state.repository';
// OAuth imports
import { OAuthService } from './oauth/services/oauth.service';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import { TwitterOAuthProvider } from './oauth/twitter-oauth.provider';
import { SessionRepository } from './repositories/session.repository';
import { AuthService } from './services/auth.service';
import { JwtAuthService } from './services/jwt.service';
import { PasskeyAuthService } from './services/passkey-auth.service';
import { SessionService } from './services/session.service';

/**
 * Auth Module
 * Handles user authentication, session management, and JWT tokens
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    UserModule,
    forwardRef(() => OnboardingModule),
    forwardRef(() => MfaVerificationModule),
  ],
  controllers: [AuthController, AuthOAuthController, PasskeyAuthController],
  providers: [
    AuthService,
    JwtAuthService,
    SessionService,
    SessionRepository,
    PasskeyAuthService,
    // OAuth providers
    OAuthService,
    OAuthStateService,
    OAuthProviderRepository,
    OAuthStateRepository,
    GoogleOAuthProvider,
    MicrosoftOAuthProvider,
    AppleOAuthProvider,
    FacebookOAuthProvider,
    TwitterOAuthProvider,
  ],
  exports: [AuthService, JwtAuthService, SessionService],
})
export class AuthModule {}
