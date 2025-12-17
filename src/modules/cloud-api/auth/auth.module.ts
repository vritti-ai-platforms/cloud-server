import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ServicesModule } from '../../../services';
import { AuthController } from './auth.controller';
import { AuthOAuthController } from './auth-oauth.controller';
import { AuthService } from './services/auth.service';
import { JwtAuthService } from './services/jwt.service';
import { SessionService } from './services/session.service';
import { SessionRepository } from './repositories/session.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountStatusGuard } from './guards/account-status.guard';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { jwtConfigFactory } from '../../../config/jwt.config';
// OAuth imports
import { OAuthService } from './oauth/services/oauth.service';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import { OAuthProviderRepository } from './oauth/repositories/oauth-provider.repository';
import { OAuthStateRepository } from './oauth/repositories/oauth-state.repository';
import { GoogleOAuthProvider } from './oauth/google-oauth.provider';
import { MicrosoftOAuthProvider } from './oauth/microsoft-oauth.provider';
import { AppleOAuthProvider } from './oauth/apple-oauth.provider';
import { FacebookOAuthProvider } from './oauth/facebook-oauth.provider';
import { TwitterOAuthProvider } from './oauth/twitter-oauth.provider';

/**
 * Auth Module
 * Handles user authentication, session management, and JWT tokens
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    UserModule,
    forwardRef(() => OnboardingModule),
  ],
  controllers: [AuthController, AuthOAuthController],
  providers: [
    AuthService,
    JwtAuthService,
    SessionService,
    SessionRepository,
    JwtStrategy,
    JwtAuthGuard,
    AccountStatusGuard,
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
  exports: [
    AuthService,
    JwtAuthService,
    SessionService,
    JwtAuthGuard,
    AccountStatusGuard,
  ],
})
export class AuthModule {}
