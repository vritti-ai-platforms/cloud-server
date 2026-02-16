import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { ServicesModule } from '../../../services';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UserModule } from '../user/user.module';
import { VerificationModule } from '../verification/verification.module';
// MFA verification submodule
import { MfaVerificationController } from './mfa-verification/controllers/mfa-verification.controller';
import { MfaChallengeStore } from './mfa-verification/services/mfa-challenge.store';
import { MfaVerificationService } from './mfa-verification/services/mfa-verification.service';
// OAuth submodule
import { OAuthController } from './oauth/controllers/oauth.controller';
import { AppleOAuthProvider } from './oauth/providers/apple-oauth.provider';
import { FacebookOAuthProvider } from './oauth/providers/facebook-oauth.provider';
import { GoogleOAuthProvider } from './oauth/providers/google-oauth.provider';
import { MicrosoftOAuthProvider } from './oauth/providers/microsoft-oauth.provider';
import { TwitterOAuthProvider } from './oauth/providers/twitter-oauth.provider';
import { OAuthProviderRepository } from './oauth/repositories/oauth-provider.repository';
import { OAuthStateRepository } from './oauth/repositories/oauth-state.repository';
import { OAuthService } from './oauth/services/oauth.service';
import { OAuthCryptoService } from './oauth/services/oauth-crypto.service';
import { OAuthStateService } from './oauth/services/oauth-state.service';
// Passkey submodule
import { PasskeyAuthController } from './passkey/controllers/passkey-auth.controller';
import { PasskeyAuthService } from './passkey/services/passkey-auth.service';
// Root submodule
import { AuthController } from './root/controllers/auth.controller';
import { PasswordResetRepository } from './root/repositories/password-reset.repository';
import { SessionRepository } from './root/repositories/session.repository';
import { AuthService } from './root/services/auth.service';
import { JwtAuthService } from './root/services/jwt.service';
import { PasswordResetService } from './root/services/password-reset.service';
import { SessionService } from './root/services/session.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
    ServicesModule,
    VerificationModule,
    forwardRef(() => UserModule),
    forwardRef(() => OnboardingModule),
  ],
  controllers: [AuthController, OAuthController, PasskeyAuthController, MfaVerificationController],
  providers: [
    // Root
    AuthService,
    JwtAuthService,
    SessionService,
    SessionRepository,
    PasswordResetService,
    PasswordResetRepository,
    // Passkey
    PasskeyAuthService,
    // OAuth
    OAuthCryptoService,
    OAuthService,
    OAuthStateService,
    OAuthProviderRepository,
    OAuthStateRepository,
    GoogleOAuthProvider,
    MicrosoftOAuthProvider,
    AppleOAuthProvider,
    FacebookOAuthProvider,
    TwitterOAuthProvider,
    // MFA verification
    MfaVerificationService,
    MfaChallengeStore,
  ],
  exports: [AuthService, JwtAuthService, SessionService, MfaVerificationService, MfaChallengeStore],
})
export class AuthModule {}
