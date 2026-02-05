import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import * as crypto from 'crypto';
import { emailVerifications } from '@/db/schema';
import { EmailService } from '@/services';
import { EmailVerificationService } from '../../onboarding/services/email-verification.service';
import { OtpService } from '../../onboarding/services/otp.service';
import { UserService } from '../user.service';
import { EmailVerificationRepository } from '../../onboarding/repositories/email-verification.repository';
import { EmailChangeRequestRepository } from '../repositories/email-change-request.repository';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);
  private readonly REVERT_TOKEN_EXPIRY_HOURS = 72;

  constructor(
    private readonly emailChangeRequestRepo: EmailChangeRequestRepository,
    private readonly emailVerificationRepo: EmailVerificationRepository,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  /**
   * Step 1: Request identity verification
   * Send OTP to current email to confirm user identity
   */
  async requestIdentityVerification(userId: string): Promise<{ verificationId: string; expiresAt: Date }> {
    // Get user details
    const user = await this.userService.findById(userId);

    if (!user.emailVerified) {
      throw new BadRequestException(
        'email_not_verified',
        'Your email is not verified',
        'You must verify your current email address before you can change it.',
      );
    }

    // Send OTP to current email
    await this.emailVerificationService.sendVerificationOtp(userId, user.email, user.firstName);

    // Get the created verification record
    const verification = await this.emailVerificationRepo.findLatestByUserId(userId);
    if (!verification) {
      throw new Error('Failed to create email verification');
    }

    this.logger.log(`Identity verification OTP sent to ${user.email} for user ${userId}`);

    return {
      verificationId: verification.id,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Step 2: Verify identity
   * Verify OTP sent to current email and create change request
   */
  async verifyIdentity(
    userId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ changeRequestId: string; changeRequestsToday: number }> {
    // Find verification
    const verification = await this.emailVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException(
        'verification_not_found',
        'Verification not found',
        'The verification code you provided is invalid or has expired.',
      );
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(verification);

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(otpCode, verification.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.emailVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException(
        'code',
        'Invalid verification code',
        'The verification code you entered is incorrect. Please check the code and try again.',
      );
    }

    // Mark verification as complete
    await this.emailVerificationRepo.markAsVerified(verification.id);

    // Check rate limit
    const { requestsToday } = await this.rateLimitService.checkAndIncrementChangeRequestLimit(userId, 'email');

    // Get user details
    const user = await this.userService.findById(userId);

    // Clean up any incomplete change requests
    await this.emailChangeRequestRepo.deleteIncompleteForUser(userId);

    // Create email change request
    const changeRequest = await this.emailChangeRequestRepo.create({
      userId,
      oldEmail: user.email,
      identityVerificationId: verification.id,
      isCompleted: false,
    });

    this.logger.log(`Identity verified for email change request ${changeRequest.id} by user ${userId}`);

    return {
      changeRequestId: changeRequest.id,
      changeRequestsToday: requestsToday,
    };
  }

  /**
   * Step 3: Submit new email
   * Validate new email and send verification OTP
   */
  async submitNewEmail(
    userId: string,
    changeRequestId: string,
    newEmail: string,
  ): Promise<{ verificationId: string; expiresAt: Date }> {
    // Find change request
    const changeRequest = await this.emailChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException(
        'change_request_not_found',
        'Change request not found',
        'Your email change request is invalid or has expired. Please start the process again.',
      );
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException(
        'change_request_completed',
        'Change request already completed',
        'This email change request has already been completed.',
      );
    }

    // Check if new email is same as current
    if (newEmail.toLowerCase() === changeRequest.oldEmail.toLowerCase()) {
      throw new BadRequestException(
        'same_email',
        'New email cannot be the same as current email',
        'Please enter a different email address than your current one.',
      );
    }

    // Check if new email is already in use
    const existingUser = await this.userService.findByEmail(newEmail);
    if (existingUser) {
      throw new BadRequestException(
        'email_in_use',
        'Email address already in use',
        'This email address is already associated with another account. Please use a different email.',
      );
    }

    // Update change request with new email
    await this.emailChangeRequestRepo.update(changeRequest.id, {
      newEmail,
    });

    // Delete any existing verifications for this new email
    await this.emailVerificationRepo.deleteMany(eq(emailVerifications.email, newEmail));

    // Send OTP to new email
    const user = await this.userService.findById(userId);
    await this.emailVerificationService.sendVerificationOtp(userId, newEmail, user.firstName);

    // Get the created verification record
    const verification = await this.emailVerificationRepo.findLatestByUserId(userId);
    if (!verification) {
      throw new Error('Failed to create email verification');
    }

    // Update change request with new email verification ID
    await this.emailChangeRequestRepo.update(changeRequest.id, {
      newEmailVerificationId: verification.id,
    });

    this.logger.log(`Verification OTP sent to new email for change request ${changeRequest.id}`);

    return {
      verificationId: verification.id,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Step 4: Verify new email
   * Verify OTP sent to new email and complete the change
   */
  async verifyNewEmail(
    userId: string,
    changeRequestId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ success: boolean; revertToken: string; revertExpiresAt: Date; newEmail: string }> {
    // Find change request
    const changeRequest = await this.emailChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException(
        'change_request_not_found',
        'Change request not found',
        'Your email change request is invalid or has expired. Please start the process again.',
      );
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException(
        'change_request_completed',
        'Change request already completed',
        'This email change request has already been completed.',
      );
    }

    if (!changeRequest.newEmail) {
      throw new BadRequestException(
        'new_email_missing',
        'New email not provided',
        'Please provide a new email address before verifying.',
      );
    }

    // Find verification
    const verification = await this.emailVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException(
        'verification_not_found',
        'Verification not found',
        'The verification code you provided is invalid or has expired.',
      );
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(verification);

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(otpCode, verification.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.emailVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException(
        'code',
        'Invalid verification code',
        'The verification code you entered is incorrect. Please check the code and try again.',
      );
    }

    // Mark verification as complete
    await this.emailVerificationRepo.markAsVerified(verification.id);

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

    // Get user details for notification
    const user = await this.userService.findById(userId);

    // Send notification to old email with revert link (fire and forget)
    this.emailService
      .sendEmailChangeNotification(
        changeRequest.oldEmail,
        changeRequest.newEmail,
        revertToken,
        revertExpiresAt,
        user.firstName ?? undefined,
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

  /**
   * Revert email change using revert token
   */
  async revertChange(revertToken: string): Promise<{ success: boolean; revertedEmail: string }> {
    // Find change request by revert token
    const changeRequest = await this.emailChangeRequestRepo.findCompletedByRevertToken(revertToken);

    if (!changeRequest) {
      throw new BadRequestException(
        'invalid_token',
        'Invalid or expired revert token',
        'The revert link you used is invalid or has expired. Please contact support if you need assistance.',
      );
    }

    // Check token not expired
    if (changeRequest.revertExpiresAt && new Date() > changeRequest.revertExpiresAt) {
      throw new BadRequestException(
        'token_expired',
        'Revert token has expired',
        'The revert link has expired. You can no longer revert this email change. Please contact support if you need assistance.',
      );
    }

    // Check not already reverted
    if (changeRequest.revertedAt) {
      throw new BadRequestException(
        'already_reverted',
        'Email change already reverted',
        'This email change has already been reverted.',
      );
    }

    // Restore old email
    await this.userService.update(changeRequest.userId, {
      email: changeRequest.oldEmail,
      emailVerified: true,
    });

    // Mark as reverted
    await this.emailChangeRequestRepo.markAsReverted(changeRequest.id);

    // Get user details for confirmation email
    const user = await this.userService.findById(changeRequest.userId);

    // Send confirmation email to restored email (fire and forget)
    this.emailService.sendEmailRevertConfirmation(changeRequest.oldEmail, user.firstName ?? undefined).catch((error) => {
      this.logger.error(`Failed to send email revert confirmation: ${error.message}`);
    });

    this.logger.log(`Email change reverted for user ${changeRequest.userId}. Restored to ${changeRequest.oldEmail}`);

    return {
      success: true,
      revertedEmail: changeRequest.oldEmail,
    };
  }

  /**
   * Resend OTP for email verification
   */
  async resendOtp(userId: string, verificationId: string): Promise<{ success: boolean; expiresAt: Date }> {
    // Find verification
    const verification = await this.emailVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException(
        'verification_not_found',
        'Verification not found',
        'The verification you are trying to resend is invalid or has expired.',
      );
    }

    if (verification.isVerified) {
      throw new BadRequestException(
        'already_verified',
        'Verification already completed',
        'This verification has already been completed.',
      );
    }

    // Delete old verification
    await this.emailVerificationRepo.delete(verification.id);

    // Send new OTP
    const user = await this.userService.findById(userId);
    await this.emailVerificationService.sendVerificationOtp(userId, verification.email, user.firstName);

    // Get the new verification record
    const newVerification = await this.emailVerificationRepo.findLatestByUserId(userId);
    if (!newVerification) {
      throw new Error('Failed to create email verification');
    }

    this.logger.log(`Resent OTP for user ${userId} to ${verification.email}`);

    return {
      success: true,
      expiresAt: newVerification.expiresAt,
    };
  }
}
