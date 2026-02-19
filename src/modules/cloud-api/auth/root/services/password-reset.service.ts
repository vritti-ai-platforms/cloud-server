import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { randomUUID } from 'node:crypto';
import { VerificationChannelValues } from '@/db/schema';
import { EmailService, EncryptionService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { SessionService } from './session.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  // Max time (in minutes) after OTP verification to use the reset token
  private readonly RESET_TOKEN_EXPIRY_MINUTES = 10;

  constructor(
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Always returns success to avoid revealing whether the email exists
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

    // Create unified verification record
    const { verificationId, otp } = await this.verificationService.createVerification(
      user.id,
      VerificationChannelValues.EMAIL,
      email,
    );

    // Store password reset with verification reference
    await this.passwordResetRepo.create({
      userId: user.id,
      email,
      verificationId,
    });

    // Fire and forget - don't block response waiting for email
    this.emailService
      .sendPasswordResetEmail(email, otp, user.displayName || undefined)
      .then(() => {
        this.logger.log(`Sent password reset email to ${email} for user ${user.id}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      });

    return successResponse;
  }

  // Validates the OTP and returns a one-time reset token for password change
  async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    // Find latest unused reset request for this email
    const resetRequest = await this.passwordResetRepo.findLatestByEmail(email);

    if (!resetRequest || !resetRequest.verificationId) {
      throw new BadRequestException({
        label: 'Reset Request Not Found',
        detail: "We couldn't find a password reset request for this email. Please request a new code to continue.",
      });
    }

    // Verify OTP via unified verification service (throws on failure)
    await this.verificationService.validateOtp(resetRequest.verificationId, resetRequest.userId, otp);

    // Generate reset token
    const resetToken = randomUUID();

    // Store reset token on the password reset record
    await this.passwordResetRepo.storeResetToken(resetRequest.id, resetToken);

    this.logger.log(`Password reset OTP verified for email ${email}`);

    return { resetToken };
  }

  // Sets a new password using a verified reset token and invalidates all sessions
  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find the reset request by token
    const resetRequest = await this.passwordResetRepo.findByResetToken(resetToken);

    if (!resetRequest || !resetRequest.verificationId) {
      throw new BadRequestException({
        label: 'Invalid Reset Token',
        detail: 'This password reset link is invalid or has expired. Please request a new password reset.',
      });
    }

    // Look up the verification record for verifiedAt timestamp
    const verification = await this.verificationService.findById(resetRequest.verificationId);

    if (verification?.verifiedAt) {
      const expiryTime = new Date(verification.verifiedAt);
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
