import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { VerificationChannelValues } from '@/db/schema';
import { EmailService } from '@/services';
import { VerificationService } from '../../verification/services/verification.service';
import { EmailChangeRequestRepository } from '../repositories/email-change-request.repository';
import { RateLimitService } from './rate-limit.service';
import { UserService } from './user.service';

@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);
  private readonly REVERT_TOKEN_EXPIRY_HOURS = 72;

  constructor(
    private readonly emailChangeRequestRepo: EmailChangeRequestRepository,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  // Sends OTP to current email to confirm user identity (step 1)
  async requestIdentityVerification(userId: string): Promise<{ verificationId: string; expiresAt: Date }> {
    const user = await this.userService.findById(userId);

    if (!user.emailVerified) {
      throw new BadRequestException({
        label: 'Email Not Verified',
        detail: 'You must verify your current email address before you can change it.',
      });
    }

    // Create unified verification and get plaintext OTP
    const { verificationId, otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      user.email,
    );

    // Send OTP email (fire and forget)
    this.emailService.sendVerificationEmail(user.email, otp, user.displayName || undefined).catch((error) => {
      this.logger.error(`Failed to send identity verification email to ${user.email}: ${error.message}`);
    });

    this.logger.log(`Identity verification OTP sent to ${user.email} for user ${userId}`);

    return { verificationId, expiresAt };
  }

  // Verifies OTP sent to current email and creates change request (step 2)
  async verifyIdentity(
    userId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ changeRequestId: string; changeRequestsToday: number }> {
    // Verify OTP via unified verification service (throws on failure)
    await this.verificationService.validateOtp(verificationId, userId, otpCode);

    // Check rate limit
    const { requestsToday } = await this.rateLimitService.checkAndIncrementChangeRequestLimit(userId, 'email');

    const user = await this.userService.findById(userId);

    // Clean up any incomplete change requests
    await this.emailChangeRequestRepo.deleteIncompleteForUser(userId);

    // Create email change request
    const changeRequest = await this.emailChangeRequestRepo.create({
      userId,
      oldEmail: user.email,
      identityVerificationId: verificationId,
      isCompleted: false,
    });

    this.logger.log(`Identity verified for email change request ${changeRequest.id} by user ${userId}`);

    return {
      changeRequestId: changeRequest.id,
      changeRequestsToday: requestsToday,
    };
  }

  // Validates new email and sends verification OTP to it (step 3)
  async submitNewEmail(
    userId: string,
    changeRequestId: string,
    newEmail: string,
  ): Promise<{ verificationId: string; expiresAt: Date }> {
    const changeRequest = await this.emailChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException({
        label: 'Change Request Not Found',
        detail: 'Your email change request is invalid or has expired. Please start the process again.',
      });
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException({
        label: 'Change Request Already Completed',
        detail: 'This email change request has already been completed.',
      });
    }

    if (newEmail.toLowerCase() === changeRequest.oldEmail.toLowerCase()) {
      throw new BadRequestException({
        label: 'Same Email',
        detail: 'Please enter a different email address than your current one.',
      });
    }

    const existingUser = await this.userService.findByEmail(newEmail);
    if (existingUser) {
      throw new BadRequestException({
        label: 'Email Already In Use',
        detail: 'This email address is already associated with another account. Please use a different email.',
      });
    }

    // Update change request with new email
    await this.emailChangeRequestRepo.update(changeRequest.id, { newEmail });

    // Create unified verification and get plaintext OTP
    const { verificationId, otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      newEmail,
    );

    // Update change request with new email verification ID
    await this.emailChangeRequestRepo.update(changeRequest.id, {
      newEmailVerificationId: verificationId,
    });

    // Send OTP to new email (fire and forget)
    const user = await this.userService.findById(userId);
    this.emailService.sendVerificationEmail(newEmail, otp, user.displayName || undefined).catch((error) => {
      this.logger.error(`Failed to send verification email to ${newEmail}: ${error.message}`);
    });

    this.logger.log(`Verification OTP sent to new email for change request ${changeRequest.id}`);

    return { verificationId, expiresAt };
  }

  // Verifies OTP sent to new email and completes the change (step 4)
  async verifyNewEmail(
    userId: string,
    changeRequestId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ success: boolean; revertToken: string; revertExpiresAt: Date; newEmail: string }> {
    const changeRequest = await this.emailChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException({
        label: 'Change Request Not Found',
        detail: 'Your email change request is invalid or has expired. Please start the process again.',
      });
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException({
        label: 'Change Request Already Completed',
        detail: 'This email change request has already been completed.',
      });
    }

    if (!changeRequest.newEmail) {
      throw new BadRequestException({
        label: 'New Email Not Provided',
        detail: 'Please provide a new email address before verifying.',
      });
    }

    // Verify OTP via unified verification service (throws on failure)
    await this.verificationService.validateOtp(verificationId, userId, otpCode);

    // Generate revert token
    const revertToken = crypto.randomUUID();
    const revertExpiresAt = new Date();
    revertExpiresAt.setHours(revertExpiresAt.getHours() + this.REVERT_TOKEN_EXPIRY_HOURS);

    // Update user's email
    await this.userService.update(userId, {
      email: changeRequest.newEmail,
      emailVerified: true,
    });

    // Mark change request as completed
    await this.emailChangeRequestRepo.markAsCompleted(changeRequest.id, revertToken, revertExpiresAt);

    const user = await this.userService.findById(userId);

    // Send notification to old email with revert link (fire and forget)
    this.emailService
      .sendEmailChangeNotification(
        changeRequest.oldEmail,
        changeRequest.newEmail,
        revertToken,
        revertExpiresAt,
        user.displayName ?? undefined,
      )
      .catch((error) => {
        this.logger.error(`Failed to send email change notification: ${error.message}`);
      });

    this.logger.log(
      `Email changed successfully for user ${userId}. Revert token valid until ${revertExpiresAt.toISOString()}`,
    );

    return {
      success: true,
      revertToken,
      revertExpiresAt,
      newEmail: changeRequest.newEmail,
    };
  }

  // Reverts a completed email change using the revert token
  async revertChange(revertToken: string): Promise<{ success: boolean; revertedEmail: string }> {
    const changeRequest = await this.emailChangeRequestRepo.findCompletedByRevertToken(revertToken);

    if (!changeRequest) {
      throw new BadRequestException({
        label: 'Invalid Revert Token',
        detail: 'The revert link you used is invalid or has expired. Please contact support if you need assistance.',
      });
    }

    if (changeRequest.revertExpiresAt && new Date() > changeRequest.revertExpiresAt) {
      throw new BadRequestException({
        label: 'Revert Token Expired',
        detail:
          'The revert link has expired. You can no longer revert this email change. Please contact support if you need assistance.',
      });
    }

    if (changeRequest.revertedAt) {
      throw new BadRequestException({
        label: 'Already Reverted',
        detail: 'This email change has already been reverted.',
      });
    }

    // Restore old email
    await this.userService.update(changeRequest.userId, {
      email: changeRequest.oldEmail,
      emailVerified: true,
    });

    await this.emailChangeRequestRepo.markAsReverted(changeRequest.id);

    const user = await this.userService.findById(changeRequest.userId);

    // Send confirmation email to restored email (fire and forget)
    this.emailService
      .sendEmailRevertConfirmation(changeRequest.oldEmail, user.displayName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send email revert confirmation: ${error.message}`);
      });

    this.logger.log(`Email change reverted for user ${changeRequest.userId}. Restored to ${changeRequest.oldEmail}`);

    return {
      success: true,
      revertedEmail: changeRequest.oldEmail,
    };
  }

  // Resends the verification OTP by deleting the old one and creating a new one
  async resendOtp(
    userId: string,
    verificationId: string,
  ): Promise<{ success: boolean; verificationId: string; expiresAt: Date }> {
    // Resend via unified verification service (handles validation, deletion, and recreation)
    const result = await this.verificationService.resendVerification(verificationId, userId);

    // Look up the new verification to get the target email
    const newVerification = await this.verificationService.findById(result.verificationId);

    // Send OTP to the target email (fire and forget)
    const user = await this.userService.findById(userId);
    if (newVerification && newVerification.target) {
      this.emailService
        .sendVerificationEmail(newVerification.target, result.otp, user.displayName || undefined)
        .catch((error) => {
          this.logger.error(`Failed to resend verification email: ${error.message}`);
        });
    }

    this.logger.log(`Resent OTP for user ${userId}`);

    return {
      success: true,
      verificationId: result.verificationId,
      expiresAt: result.expiresAt,
    };
  }
}
