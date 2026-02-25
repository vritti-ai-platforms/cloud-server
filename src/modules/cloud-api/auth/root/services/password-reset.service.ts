import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { OnboardingStepValues, SessionTypeValues, VerificationChannelValues } from '@/db/schema';
import { EmailService } from '@vritti/api-sdk';
import { EncryptionService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { SessionService } from './session.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  // Max time (in minutes) after OTP verification to complete the password reset
  private readonly RESET_WINDOW_MINUTES = 10;

  constructor(
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Security message — identical for found and not-found cases to prevent email enumeration
  private readonly RESET_MESSAGE = 'If an account exists, a reset code has been sent.';

  // Sends OTP and creates a RESET session. Returns generic message if user not found (no enumeration).
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; accessToken?: string; expiresIn?: number; refreshToken?: string }> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return { success: true, message: this.RESET_MESSAGE };
    }

    // OAuth-only accounts have no password to reset
    if (!user.passwordHash) {
      this.logger.log(`Password reset requested for OAuth-only user: ${user.id}`);
      return { success: true, message: this.RESET_MESSAGE };
    }

    // Create verification record with OTP
    const { otp, expiresAt } = await this.verificationService.createVerification(
      user.id,
      VerificationChannelValues.EMAIL,
      email,
    );

    // Fire and forget email
    this.emailService
      .sendPasswordResetEmail(email, otp, expiresAt, user.displayName || undefined)
      .then(() => {
        this.logger.log(`Sent password reset email to ${email} for user ${user.id}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      });

    // Create RESET session
    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createSession(
      user.id,
      SessionTypeValues.RESET,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Created RESET session for user: ${user.id}`);

    return { success: true, message: this.RESET_MESSAGE, accessToken, refreshToken, expiresIn };
  }

  // Resends OTP using userId from the RESET session
  async resendOtp(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userService.findById(userId);

    const { otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      user.email,
    );

    this.emailService
      .sendPasswordResetEmail(user.email, otp, expiresAt, user.displayName || undefined)
      .then(() => {
        this.logger.log(`Resent password reset email for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to resend password reset email for user ${userId}: ${error.message}`);
      });

    return { success: true, message: 'Verification code sent successfully.' };
  }

  // Verifies OTP using userId from the RESET session
  async verifyResetOtp(userId: string, otp: string): Promise<{ success: boolean; message: string }> {
    await this.verificationService.verifyVerification(otp, VerificationChannelValues.EMAIL, userId);

    this.logger.log(`Password reset OTP verified for user ${userId}`);

    return { success: true, message: 'Code verified successfully.' };
  }

  // Resets password, invalidates all sessions, and creates a new session based on onboarding status
  async resetPassword(
    userId: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    success: boolean;
    message: string;
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    sessionType: string;
  }> {
    // Check verification is complete and within the reset window
    const verification = await this.verificationService.findByUserIdAndChannel(
      userId,
      VerificationChannelValues.EMAIL,
    );

    if (!verification?.isVerified || !verification.verifiedAt) {
      throw new BadRequestException({
        label: 'OTP Not Verified',
        detail: 'Please verify the OTP code before resetting your password.',
      });
    }

    const expiryTime = new Date(verification.verifiedAt);
    expiryTime.setMinutes(expiryTime.getMinutes() + this.RESET_WINDOW_MINUTES);

    if (new Date() > expiryTime) {
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Your password reset session has expired. Please request a new password reset.',
      });
    }

    // Hash and update password
    const passwordHash = await this.encryptionService.hashPassword(newPassword);
    await this.userService.update(userId, { passwordHash });

    // Determine the correct session type based on onboarding status
    const user = await this.userService.findById(userId);
    const targetSessionType =
      user.onboardingStep === OnboardingStepValues.COMPLETE
        ? SessionTypeValues.CLOUD
        : SessionTypeValues.ONBOARDING;

    // Invalidate ALL sessions for security (kills any compromised sessions + RESET session)
    await this.sessionService.invalidateAllUserSessions(userId);

    // Create a fresh session with the appropriate type
    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createSession(
      userId,
      targetSessionType,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Password reset completed for user ${userId}, session type: ${targetSessionType}`);

    return {
      success: true,
      message: 'Password has been reset successfully.',
      accessToken,
      expiresIn,
      refreshToken,
      sessionType: targetSessionType,
    };
  }
}
