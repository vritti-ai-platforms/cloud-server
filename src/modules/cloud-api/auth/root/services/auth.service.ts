import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import { TokenType } from '../../../../../config/jwt.config';
import { EncryptionService } from '../../../../../services';
import { UserDto } from '../../../user/dto/entity/user.dto';
import { UserService } from '../../../user/services/user.service';
import { MfaVerificationService } from '../../mfa-verification/services/mfa-verification.service';
import { SessionResponse } from '../dto/entity/session-response.dto';
import { LoginDto } from '../dto/request/login.dto';
import { SignupDto } from '../dto/request/signup.dto';
import { AuthStatusResponse } from '../dto/response/auth-status-response.dto';
import { LoginResponse } from '../dto/response/login-response.dto';
import { SignupResponseDto } from '../dto/response/signup-response.dto';
import { JwtAuthService } from './jwt.service';
import { PasswordResetService } from './password-reset.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtAuthService,
    @Inject(forwardRef(() => MfaVerificationService))
    private readonly mfaVerificationService: MfaVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  // Creates a new user or sets password for OAuth users without one
  async signup(
    dto: SignupDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SignupResponseDto & { refreshToken: string }> {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      // Completed onboarding — must use login
      if (existingUser.onboardingStep === OnboardingStepValues.COMPLETE) {
        throw new ConflictException({
          label: 'Account Exists',
          detail: 'An account with this email already exists. Please log in instead.',
        });
      }

      // Incomplete onboarding — delete and start fresh
      await this.sessionService.invalidateAllUserSessions(existingUser.id);
      await this.userService.delete(existingUser.id);

      this.logger.log(`Deleted incomplete user for re-signup: ${existingUser.email} (${existingUser.id})`);
    }

    // New user
    const passwordHash = await this.encryptionService.hashPassword(dto.password);

    const user = await this.userService.create(
      { email: dto.email, firstName: dto.firstName, lastName: dto.lastName },
      passwordHash,
      true,
    );

    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createSession(
      user.id,
      SessionTypeValues.ONBOARDING,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Created new user: ${user.email} (${user.id})`);

    return { ...SignupResponseDto.from(user, accessToken, expiresIn), refreshToken };
  }

  // Validates credentials and creates session, or returns MFA challenge if 2FA enabled
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponse & { refreshToken?: string }> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException({
        label: 'Invalid Credentials',
        detail: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException({
        label: 'Invalid Credentials',
        detail: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      });
    }

    const isPasswordValid = await this.encryptionService.comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        label: 'Invalid Credentials',
        detail: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      });
    }

    // Incomplete onboarding — create ONBOARDING session so user can access onboarding endpoints
    if (user.onboardingStep !== OnboardingStepValues.COMPLETE) {
      const { accessToken, refreshToken } = await this.sessionService.createSession(
        user.id,
        SessionTypeValues.ONBOARDING,
        ipAddress,
        userAgent,
      );

      this.logger.log(`User login - requires onboarding: ${user.email} (${user.id})`);

      return {
        ...new LoginResponse({
          accessToken,
          expiresIn: this.jwtService.getExpiryInSeconds(TokenType.ACCESS),
          requiresOnboarding: true,
          onboardingStep: user.onboardingStep,
          user: UserDto.from(user),
        }),
        refreshToken,
      };
    }

    // Only ACTIVE users can login
    if (user.accountStatus !== AccountStatusValues.ACTIVE) {
      throw new UnauthorizedException({
        label: 'Account Unavailable',
        detail: `Your account is ${user.accountStatus.toLowerCase()}. Please contact support for assistance.`,
      });
    }

    // Check if user has 2FA enabled
    const mfaChallenge = await this.mfaVerificationService.createMfaChallenge(user, {
      ipAddress,
      userAgent,
    });

    if (mfaChallenge) {
      this.logger.log(`User login requires MFA: ${user.email} (${user.id})`);

      return new LoginResponse({
        requiresMfa: true,
        mfaChallenge: {
          sessionId: mfaChallenge.sessionId,
          availableMethods: mfaChallenge.availableMethods,
          defaultMethod: mfaChallenge.defaultMethod,
          maskedPhone: mfaChallenge.maskedPhone,
        },
      });
    }

    // No 2FA — create CLOUD session
    const { accessToken, refreshToken } = await this.sessionService.createSession(
      user.id,
      SessionTypeValues.CLOUD,
      ipAddress,
      userAgent,
    );

    // Delete all onboarding sessions (user has completed onboarding)
    await this.sessionService.deleteOnboardingSessions(user.id);

    await this.userService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    return {
      ...new LoginResponse({
        accessToken,
        expiresIn: this.jwtService.getExpiryInSeconds(TokenType.ACCESS),
        user: UserDto.from(user),
      }),
      refreshToken,
    };
  }

  // Returns { isAuthenticated: false } instead of throwing (never 401)
  async getAuthStatus(refreshToken: string | undefined): Promise<AuthStatusResponse> {
    if (!refreshToken) {
      return new AuthStatusResponse({ isAuthenticated: false });
    }

    try {
      const { accessToken, expiresIn, userId, sessionType } =
        await this.sessionService.generateAccessToken(refreshToken);

      const user = await this.userService.findById(userId);

      // Onboarding sessions return tokens but are not fully authenticated
      if (sessionType === SessionTypeValues.ONBOARDING) {
        return new AuthStatusResponse({ isAuthenticated: false, requiresOnboarding: true, user, accessToken, expiresIn });
      }

      this.logger.log(`Session recovered for user: ${userId}`);

      return new AuthStatusResponse({ isAuthenticated: true, user, accessToken, expiresIn });
    } catch {
      return new AuthStatusResponse({ isAuthenticated: false });
    }
  }

  // Recovers access token from httpOnly cookie without rotating refresh token
  async getAccessToken(refreshToken: string | undefined): Promise<{ accessToken: string; expiresIn: number }> {
    return this.sessionService.generateAccessToken(refreshToken);
  }

  // Rotates both tokens and returns new access + refresh tokens
  async refreshTokens(
    refreshToken: string | undefined,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.sessionService.refreshTokens(refreshToken);
  }

  // Invalidates the session associated with the given access token
  async logout(accessToken: string): Promise<void> {
    await this.sessionService.invalidateSession(accessToken);
    this.logger.log('User logged out');
  }

  // Invalidates all active sessions for a user across all devices
  async logoutAll(userId: string): Promise<number> {
    const count = await this.sessionService.invalidateAllUserSessions(userId);
    this.logger.log(`User logged out from all devices: ${userId}`);
    return count;
  }

  // Validates that a user exists and has an active account
  async validateUser(userId: string): Promise<UserDto> {
    const user = await this.userService.findById(userId);

    if (user.accountStatus !== AccountStatusValues.ACTIVE) {
      throw new UnauthorizedException({
        label: 'Account Inactive',
        detail: 'Your account is not active. Please contact support for assistance.',
      });
    }

    return user;
  }

  // Returns active sessions for the user, marking the current one
  async getUserSessions(userId: string, currentAccessToken: string): Promise<SessionResponse[]> {
    const sessions = await this.sessionService.getUserActiveSessions(userId);
    return sessions.map((session) => SessionResponse.from(session, currentAccessToken));
  }

  // Revokes a specific session, preventing revocation of the current one
  async revokeSession(userId: string, sessionId: string, currentAccessToken: string): Promise<{ message: string }> {
    const currentSession = await this.sessionService.validateAccessToken(currentAccessToken);
    if (currentSession.id === sessionId) {
      throw new BadRequestException({
        label: 'Cannot Revoke',
        detail: 'You cannot revoke your current session. Use logout instead.',
      });
    }

    const sessions = await this.sessionService.getUserActiveSessions(userId);
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      throw new NotFoundException('The session you are trying to revoke does not exist or has already been revoked.');
    }

    if (targetSession.userId !== userId) {
      throw new UnauthorizedException('You do not have permission to revoke this session.');
    }

    await this.sessionService.invalidateSession(targetSession.accessToken);
    this.logger.log(`Session ${sessionId} revoked for user: ${userId}`);

    return { message: 'Session revoked successfully' };
  }

  // Verifies current password and updates to a new one
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const userResponse = await this.userService.findById(userId);
    const user = await this.userService.findByEmail(userResponse.email);

    if (!user) {
      throw new UnauthorizedException("We couldn't find your account. Please log in again.");
    }

    if (!user.passwordHash) {
      throw new BadRequestException({
        label: 'No Password Set',
        detail: 'Your account does not have a password set. Please use password recovery or OAuth sign-in.',
        errors: [{ field: 'password', message: 'No password set' }],
      });
    }

    const isCurrentPasswordValid = await this.encryptionService.comparePassword(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('The current password you entered is incorrect. Please try again.');
    }

    const isSamePassword = await this.encryptionService.comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException({
        label: 'Password Already In Use',
        detail: 'Your new password must be different from your current password.',
        errors: [{ field: 'newPassword', message: 'Password already in use' }],
      });
    }

    const newPasswordHash = await this.encryptionService.hashPassword(newPassword);

    await this.userService.update(user.id, { passwordHash: newPasswordHash });

    this.logger.log(`Password changed for user: ${user.id}`);
  }

  // Sends password reset OTP to the given email
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    return this.passwordResetService.requestPasswordReset(email);
  }

  // Validates password reset OTP and returns a reset token
  async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    return this.passwordResetService.verifyResetOtp(email, otp);
  }

  // Sets new password using the verified reset token
  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.passwordResetService.resetPassword(resetToken, newPassword);
  }
}
