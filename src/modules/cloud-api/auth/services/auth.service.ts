import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues, type User } from '@/db/schema';
import { TokenType } from '../../../../config/jwt.config';
import { EncryptionService } from '../../../../services';
import { OnboardingStatusResponseDto } from '../../onboarding/dto/onboarding-status-response.dto';
import { UserResponseDto } from '../../user/dto/user-response.dto';
import { UserService } from '../../user/user.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import type { LoginDto } from '../dto/login.dto';
import type { SignupDto } from '../dto/signup.dto';
import { MfaVerificationService } from '../mfa-verification/mfa-verification.service';
import { JwtAuthService } from './jwt.service';
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
  ) {}

  /**
   * User login
   * Only ACTIVE users can login
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto & { refreshToken?: string }> {
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
      return new AuthResponseDto({
        requiresOnboarding: true,
        onboardingToken,
        onboardingStep: user.onboardingStep,
        user: UserResponseDto.from(user),
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

      return new AuthResponseDto({
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
      ...new AuthResponseDto({
        accessToken,
        expiresIn: this.jwtService.getAccessTokenExpiryInSeconds(),
        user: UserResponseDto.from(user),
      }),
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    // Refresh access token
    const tokens = await this.sessionService.refreshAccessToken(refreshToken);

    // Verify token to get userId
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // Get user
    const userResponse = await this.userService.findById(payload.userId);

    // Get fresh user data
    const freshUser = await this.userService.findByEmail(userResponse.email);

    if (!freshUser) {
      throw new UnauthorizedException({
        label: 'Account Not Found',
        detail: 'Your account could not be found. Please log in again.',
      });
    }

    this.logger.log(`Token refreshed for user: ${payload.userId}`);

    return new AuthResponseDto({
      accessToken: tokens.accessToken,
      expiresIn: this.jwtService.getAccessTokenExpiryInSeconds(),
      user: UserResponseDto.from(freshUser),
    });
  }

  /**
   * Logout - invalidate session
   */
  async logout(accessToken: string): Promise<void> {
    await this.sessionService.invalidateSession(accessToken);
    this.logger.log('User logged out');
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<number> {
    const count = await this.sessionService.invalidateAllUserSessions(userId);
    this.logger.log(`User logged out from all devices: ${userId}`);
    return count;
  }

  /**
   * Validate user from JWT payload
   * Used by JWT strategy
   */
  async validateUser(userId: string): Promise<UserResponseDto> {
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

  /**
   * Smart signup endpoint - handles both new registration and resume
   * This is the main entry point for user registration
   */
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

  /**
   * Resume existing onboarding
   */
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

  /**
   * Create new user and start onboarding
   */
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

    return OnboardingStatusResponseDto.fromUserResponseDto(userResponse, true);
  }

  /**
   * Generate onboarding JWT token
   */
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

  /**
   * Change user password
   * Validates current password before updating
   */
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

    const isCurrentPasswordValid = await this.encryptionService.comparePassword(
      currentPassword,
      user.passwordHash,
    );

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
}
