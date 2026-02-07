import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { randomUUID } from 'node:crypto';
import { EmailService, EncryptionService } from '../../../../services';
import { OtpService } from '../../onboarding/services/otp.service';
import { UserService } from '../../user/user.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { SessionService } from './session.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /** Max time (in minutes) after OTP verification to use the reset token */
  private readonly RESET_TOKEN_EXPIRY_MINUTES = 10;

  constructor(
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Request a password reset - sends OTP to email
   * Always returns success to avoid revealing whether the email exists
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent.',
    };

    // Find user by email
    const user = await this.userService.findByEmail(email);

    // Don't reveal if user exists or not
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return successResponse;
    }

    // Don't send reset if user has no password (OAuth-only account)
    if (!user.passwordHash) {
      this.logger.log(`Password reset requested for OAuth-only user: ${user.id}`);
      return successResponse;
    }

    // Generate OTP
    const otp = this.otpService.generateOtp();
    this.logger.log(`Generated password reset OTP for user ${user.id}`);
    const hashedOtp = await this.otpService.hashOtp(otp);
    const expiresAt = this.otpService.getOtpExpiryTime();

    // Store in database
    await this.passwordResetRepo.create({
      userId: user.id,
      email,
      otp: hashedOtp,
      expiresAt,
    });

    // Fire and forget - don't block response waiting for email
    this.emailService
      .sendPasswordResetEmail(email, otp, user.firstName || undefined)
      .then(() => {
        this.logger.log(`Sent password reset email to ${email} for user ${user.id}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      });

    return successResponse;
  }

  /**
   * Verify the OTP and issue a reset token
   */
  async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    // Find latest non-verified, non-used reset request for this email
    const resetRequest = await this.passwordResetRepo.findLatestByEmail(email);

    if (!resetRequest) {
      throw new BadRequestException({
        label: 'Reset Request Not Found',
        detail: "We couldn't find a password reset request for this email. Please request a new code to continue.",
      });
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(resetRequest);

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(otp, resetRequest.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.passwordResetRepo.incrementAttempts(resetRequest.id);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The code you entered is incorrect. Please check the code and try again.',
        errors: [{ field: 'code', message: 'Invalid code' }],
      });
    }

    // Generate reset token
    const resetToken = randomUUID();

    // Mark as verified and store reset token
    await this.passwordResetRepo.markAsVerified(resetRequest.id, resetToken);

    this.logger.log(`Password reset OTP verified for email ${email}`);

    return { resetToken };
  }

  /**
   * Reset the password using the reset token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find the verified reset request by token
    const resetRequest = await this.passwordResetRepo.findByResetToken(resetToken);

    if (!resetRequest) {
      throw new BadRequestException({
        label: 'Invalid Reset Token',
        detail: 'This password reset link is invalid or has expired. Please request a new password reset.',
      });
    }

    // Check if reset token has expired (10 minutes from verification)
    if (resetRequest.verifiedAt) {
      const expiryTime = new Date(resetRequest.verifiedAt);
      expiryTime.setMinutes(expiryTime.getMinutes() + this.RESET_TOKEN_EXPIRY_MINUTES);

      if (new Date() > expiryTime) {
        throw new BadRequestException({
          label: 'Reset Token Expired',
          detail: 'Your password reset session has expired. Please request a new password reset.',
        });
      }
    }

    // Hash new password
    const passwordHash = await this.encryptionService.hashPassword(newPassword);

    // Update user's password
    await this.userService.update(resetRequest.userId, { passwordHash });

    // Mark reset request as used
    await this.passwordResetRepo.markAsUsed(resetRequest.id);

    // Invalidate all active sessions (force re-login)
    await this.sessionService.invalidateAllUserSessions(resetRequest.userId);

    this.logger.log(`Password reset completed for user ${resetRequest.userId}`);

    return {
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }
}