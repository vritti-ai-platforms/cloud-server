import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues, type User } from '@/db/schema';
import { TokenType } from '../../../../../config/jwt.config';
import { EncryptionService } from '../../../../../services';
import { OnboardingStatusResponseDto } from '../../../onboarding/root/dto/entity/onboarding-status-response.dto';
import { UserDto } from '../../../user/dto/entity/user.dto';
import { UserService } from '../../../user/services/user.service';
import { MfaVerificationService } from '../../mfa-verification/services/mfa-verification.service';
import { SessionResponse } from '../dto/entity/session-response.dto';
import { LoginDto } from '../dto/request/login.dto';
import { SignupDto } from '../dto/request/signup.dto';
import { AuthStatusResponse } from '../dto/response/auth-status-response.dto';
import { LoginResponse } from '../dto/response/login-response.dto';
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

  // Validates credentials and creates session, or returns MFA challenge if 2FA enabled
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponse & { refreshToken?: string }> {
    // Find user by email
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      // Use message-only pattern for general auth errors (not field-specific)
      // This ensures the error displays as a root form error, not on a specific field
      throw new UnauthorizedException({
        label: 'Invalid Credentials',
        detail: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      });
    }

    // Verify password (single check for all login flows)
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

    // Check if onboarding is complete
    if (user.onboardingStep !== OnboardingStepValues.COMPLETE) {
      // Generate onboarding token
      const onboardingToken = this.generateOnboardingToken(user.id);

      this.logger.log(`User login - requires onboarding: ${user.email} (${user.id})`);

      // Return response with onboarding requirements
      return new LoginResponse({
        requiresOnboarding: true,
        onboardingToken,
        onboardingStep: user.onboardingStep,
        user: UserDto.from(user),
      });
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
      // User has 2FA enabled - return MFA challenge instead of tokens
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

    // No 2FA - create session and generate tokens
    const { accessToken, refreshToken } = await this.sessionService.createUnifiedSession(
      user.id,
      SessionTypeValues.CLOUD,
      ipAddress,
      userAgent,
    );

    // Delete all onboarding sessions (user has completed onboarding)
    await this.sessionService.deleteOnboardingSessions(user.id);

    // Update last login timestamp
    await this.userService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    // Return auth response with refreshToken for controller to set as cookie
    return {
      ...new LoginResponse({
        accessToken,
        expiresIn: this.jwtService.getAccessTokenExpiryInSeconds(),
        user: UserDto.from(user),
      }),
      refreshToken,
    };
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

    // Check if account is active
    if (user.accountStatus !== AccountStatusValues.ACTIVE) {
      throw new UnauthorizedException({
        label: 'Account Inactive',
        detail: 'Your account is not active. Please contact support for assistance.',
      });
    }

    return user;
  }

  // Registers a new user or resumes onboarding for an existing incomplete account
  async signup(dto: SignupDto): Promise<OnboardingStatusResponseDto> {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      if (existingUser.onboardingStep !== OnboardingStepValues.COMPLETE) {
        // Resume onboarding
        return await this.resumeOnboarding(existingUser, dto.password);
      }
      // Onboarding complete → error
      throw new BadRequestException({
        label: 'Account Exists',
        detail: 'An account with this email already exists. Please log in instead.',
        errors: [{ field: 'email', message: 'Already registered' }],
      });
    }

    // New user
    return await this.createNewUser(dto);
  }

  private async resumeOnboarding(user: User, password: string): Promise<OnboardingStatusResponseDto> {
    // Skip password check if BOTH email AND mobile not verified
    const shouldSkipPasswordCheck = !user.emailVerified && !user.phoneVerified;

    if (!shouldSkipPasswordCheck && user.passwordHash) {
      const isPasswordValid = await this.encryptionService.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException({
          label: 'Invalid Password',
          detail: 'The password you entered is incorrect. Please enter the correct password to continue.',
          errors: [{ field: 'password', message: 'Invalid password' }],
        });
      }
    }

    this.logger.log(`Resuming onboarding for user: ${user.email} (${user.id})`);

    return OnboardingStatusResponseDto.fromUser(user, false);
  }

  private async createNewUser(dto: SignupDto): Promise<OnboardingStatusResponseDto> {
    // Hash password
    const passwordHash = await this.encryptionService.hashPassword(dto.password);

    // Create user (skip email check since signup() already verified email doesn't exist)
    const userResponse = await this.userService.create(
      {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      passwordHash,
      true, // skipEmailCheck - signup() already validated email uniqueness
    );

    // OTP sending removed - now handled by POST /onboarding/start endpoint

    // Generate onboarding token

    this.logger.log(`Created new user and started onboarding: ${userResponse.email} (${userResponse.id})`);

    return OnboardingStatusResponseDto.fromUserDto(userResponse, true);
  }

  private generateOnboardingToken(userId: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.ONBOARDING,
      },
      {
        expiresIn: '7d',
      },
    );
  }

  // Verifies current password and updates to a new one
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const userResponse = await this.userService.findById(userId);
    const user = await this.userService.findByEmail(userResponse.email);

    if (!user) {
      throw new UnauthorizedException("We couldn't find your account. Please log in again.");
    }

    // Verify current password
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

    // Ensure new password is different
    const isSamePassword = await this.encryptionService.comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException({
        label: 'Password Already In Use',
        detail: 'Your new password must be different from your current password.',
        errors: [{ field: 'newPassword', message: 'Password already in use' }],
      });
    }

    // Hash new password
    const newPasswordHash = await this.encryptionService.hashPassword(newPassword);

    // Update password
    await this.userService.update(user.id, { passwordHash: newPasswordHash });

    this.logger.log(`Password changed for user: ${user.id}`);
  }

  // Recovers access token from httpOnly cookie without rotating refresh token
  async getAccessToken(refreshToken: string | undefined): Promise<{ accessToken: string; expiresIn: number }> {
    return this.sessionService.recoverSession(refreshToken);
  }

  // Rotates both tokens and returns new access + refresh tokens
  async refreshSession(
    refreshToken: string | undefined,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.sessionService.refreshSession(refreshToken);
  }

  // Creates onboarding session and returns tokens
  async createSignupSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.sessionService.createUnifiedSession(userId, SessionTypeValues.ONBOARDING, ipAddress, userAgent);
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

  // Returns { isAuthenticated: false } instead of throwing (never 401)
  async getAuthStatus(refreshToken: string | undefined): Promise<AuthStatusResponse> {
    if (!refreshToken) {
      return new AuthStatusResponse({ isAuthenticated: false });
    }

    try {
      const { accessToken, expiresIn, userId } = await this.sessionService.recoverSession(refreshToken);
      const user = await this.userService.findById(userId);

      this.logger.log(`Session recovered for user: ${userId}`);

      return new AuthStatusResponse({ isAuthenticated: true, user, accessToken, expiresIn });
    } catch {
      return new AuthStatusResponse({ isAuthenticated: false });
    }
  }
}
