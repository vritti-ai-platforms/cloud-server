import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, normalizePhoneNumber } from '@vritti/api-sdk';
import * as crypto from 'crypto';
import { VerificationChannelValues } from '@/db/schema';
import { SmsService } from '@/services';
import { VerificationService } from '../../verification/services/verification.service';
import { UserService } from './user.service';
import { PhoneChangeRequestRepository } from '../repositories/phone-change-request.repository';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class PhoneChangeService {
  private readonly logger = new Logger(PhoneChangeService.name);
  private readonly REVERT_TOKEN_EXPIRY_HOURS = 72;

  constructor(
    private readonly phoneChangeRequestRepo: PhoneChangeRequestRepository,
    private readonly verificationService: VerificationService,
    private readonly smsService: SmsService,
    private readonly userService: UserService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  // Sends OTP to current phone to confirm user identity (step 1)
  async requestIdentityVerification(userId: string): Promise<{ expiresAt: Date }> {
    const user = await this.userService.findById(userId);

    if (!user.phoneVerified) {
      throw new BadRequestException({
        label: 'Phone Not Verified',
        detail: 'You must verify your current phone number before you can change it.',
      });
    }

    if (!user.phone) {
      throw new BadRequestException({
        label: 'Phone Number Not Found',
        detail: 'No phone number is associated with your account.',
      });
    }

    // Create unified verification and get plaintext OTP
    const { otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.SMS_OUT,
      user.phone,
    );

    // Send OTP to current phone (fire and forget)
    this.smsService
      .sendVerificationSms(`+${user.phone}`, otp, user.displayName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send SMS to ${user.phone}: ${error.message}`);
      });

    this.logger.log(`Identity verification OTP sent to ${user.phone} for user ${userId}`);

    return { expiresAt };
  }

  // Verifies OTP sent to current phone and creates change request (step 2)
  async verifyIdentity(
    userId: string,
    otpCode: string,
  ): Promise<{ changeRequestId: string; changeRequestsToday: number }> {
    // Verify OTP via unified verification service (throws on failure)
    await this.verificationService.verifyVerification(otpCode, VerificationChannelValues.SMS_OUT, userId);

    // Check rate limit
    const { requestsToday } = await this.rateLimitService.checkAndIncrementChangeRequestLimit(userId, 'phone');

    const user = await this.userService.findById(userId);

    if (!user.phone) {
      throw new BadRequestException({
        label: 'Phone Number Not Found',
        detail: 'No phone number is associated with your account.',
      });
    }

    // Clean up any incomplete change requests
    await this.phoneChangeRequestRepo.deleteIncompleteForUser(userId);

    // Create phone change request
    const changeRequest = await this.phoneChangeRequestRepo.create({
      userId,
      oldPhone: user.phone,
      oldPhoneCountry: user.phoneCountry || null,
      isCompleted: false,
    });

    this.logger.log(`Identity verified for phone change request ${changeRequest.id} by user ${userId}`);

    return {
      changeRequestId: changeRequest.id,
      changeRequestsToday: requestsToday,
    };
  }

  // Validates new phone and sends verification OTP to it (step 3)
  async submitNewPhone(
    userId: string,
    changeRequestId: string,
    newPhone: string,
    newPhoneCountry: string,
  ): Promise<{ expiresAt: Date }> {
    const changeRequest = await this.phoneChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException({
        label: 'Change Request Not Found',
        detail: 'Your phone change request is invalid or has expired. Please start the process again.',
      });
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException({
        label: 'Change Request Already Completed',
        detail: 'This phone change request has already been completed.',
      });
    }

    // Normalize phone numbers for comparison
    const normalizedNewPhone = normalizePhoneNumber(newPhone);
    const normalizedOldPhone = normalizePhoneNumber(changeRequest.oldPhone);

    if (normalizedNewPhone === normalizedOldPhone) {
      throw new BadRequestException({
        label: 'Same Phone Number',
        detail: 'Please enter a different phone number than your current one.',
      });
    }

    // Check if new phone is already in use by another user
    const phoneInUse = await this.verificationService.isTargetVerifiedByOtherUser(normalizedNewPhone, userId);
    if (phoneInUse) {
      throw new BadRequestException({
        label: 'Phone Already In Use',
        detail: 'This phone number is already associated with another account. Please use a different phone.',
      });
    }

    // Update change request with new phone
    await this.phoneChangeRequestRepo.update(changeRequest.id, {
      newPhone: normalizedNewPhone,
      newPhoneCountry: newPhoneCountry,
    });

    // Create unified verification and get plaintext OTP
    const { otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.SMS_OUT,
      normalizedNewPhone,
    );

    // Send OTP to new phone (fire and forget)
    const user = await this.userService.findById(userId);
    this.smsService
      .sendVerificationSms(`+${normalizedNewPhone}`, otp, user.displayName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send SMS to ${normalizedNewPhone}: ${error.message}`);
      });

    this.logger.log(`Verification OTP sent to new phone for change request ${changeRequest.id}`);

    return { expiresAt };
  }

  // Verifies OTP sent to new phone and completes the change (step 4)
  async verifyNewPhone(
    userId: string,
    changeRequestId: string,
    otpCode: string,
  ): Promise<{ success: boolean; revertToken: string; revertExpiresAt: Date; newPhone: string }> {
    const changeRequest = await this.phoneChangeRequestRepo.findById(changeRequestId);

    if (!changeRequest || changeRequest.userId !== userId) {
      throw new BadRequestException({
        label: 'Change Request Not Found',
        detail: 'Your phone change request is invalid or has expired. Please start the process again.',
      });
    }

    if (changeRequest.isCompleted) {
      throw new BadRequestException({
        label: 'Change Request Already Completed',
        detail: 'This phone change request has already been completed.',
      });
    }

    if (!changeRequest.newPhone) {
      throw new BadRequestException({
        label: 'New Phone Not Provided',
        detail: 'Please provide a new phone number before verifying.',
      });
    }

    // Verify OTP via unified verification service (throws on failure)
    await this.verificationService.verifyVerification(otpCode, VerificationChannelValues.SMS_OUT, userId);

    // Generate revert token
    const revertToken = crypto.randomUUID();
    const revertExpiresAt = new Date();
    revertExpiresAt.setHours(revertExpiresAt.getHours() + this.REVERT_TOKEN_EXPIRY_HOURS);

    // Update user's phone
    await this.userService.update(userId, {
      phone: changeRequest.newPhone,
      phoneCountry: changeRequest.newPhoneCountry || undefined,
      phoneVerified: true,
    });

    // Mark change request as completed
    await this.phoneChangeRequestRepo.markAsCompleted(changeRequest.id, revertToken, revertExpiresAt);

    const user = await this.userService.findById(userId);

    // Send notification to old phone with revert instructions (fire and forget)
    const revertMessage = `Hello${user.displayName ? ` ${user.displayName}` : ''}, your Vritti phone number was changed. If this wasn't you, use this token to revert within 72 hours: ${revertToken}`;
    this.smsService
      .sendVerificationSms(`+${changeRequest.oldPhone}`, revertMessage)
      .catch((error) => {
        this.logger.error(`Failed to send phone change notification: ${error.message}`);
      });

    this.logger.log(
      `Phone changed successfully for user ${userId}. Revert token valid until ${revertExpiresAt.toISOString()}`,
    );

    return {
      success: true,
      revertToken,
      revertExpiresAt,
      newPhone: changeRequest.newPhone,
    };
  }

  // Reverts a completed phone change using the revert token
  async revertChange(revertToken: string): Promise<{ success: boolean; revertedPhone: string }> {
    const changeRequest = await this.phoneChangeRequestRepo.findCompletedByRevertToken(revertToken);

    if (!changeRequest) {
      throw new BadRequestException({
        label: 'Invalid Revert Token',
        detail: 'The revert token you used is invalid or has expired. Please contact support if you need assistance.',
      });
    }

    if (changeRequest.revertExpiresAt && new Date() > changeRequest.revertExpiresAt) {
      throw new BadRequestException({
        label: 'Revert Token Expired',
        detail: 'The revert token has expired. You can no longer revert this phone change. Please contact support if you need assistance.',
      });
    }

    if (changeRequest.revertedAt) {
      throw new BadRequestException({
        label: 'Already Reverted',
        detail: 'This phone change has already been reverted.',
      });
    }

    // Restore old phone
    await this.userService.update(changeRequest.userId, {
      phone: changeRequest.oldPhone,
      phoneCountry: changeRequest.oldPhoneCountry || undefined,
      phoneVerified: true,
    });

    await this.phoneChangeRequestRepo.markAsReverted(changeRequest.id);

    const user = await this.userService.findById(changeRequest.userId);

    // Send confirmation SMS to restored phone (fire and forget)
    const confirmMessage = `Hello${user.displayName ? ` ${user.displayName}` : ''}, your Vritti phone number has been successfully restored to this number.`;
    this.smsService
      .sendVerificationSms(`+${changeRequest.oldPhone}`, confirmMessage)
      .catch((error) => {
        this.logger.error(`Failed to send phone revert confirmation: ${error.message}`);
      });

    this.logger.log(`Phone change reverted for user ${changeRequest.userId}. Restored to ${changeRequest.oldPhone}`);

    return {
      success: true,
      revertedPhone: changeRequest.oldPhone,
    };
  }

  // Resends the verification OTP by looking up the active verification and creating a new one
  async resendOtp(userId: string): Promise<{ success: boolean; expiresAt: Date }> {
    const existing = await this.verificationService.findByUserIdAndChannel(userId, VerificationChannelValues.SMS_OUT);
    if (!existing || !existing.target) {
      throw new NotFoundException('No active verification found. Please start the process again.');
    }
    const { otp, expiresAt } = await this.verificationService.createVerification(userId, VerificationChannelValues.SMS_OUT, existing.target);
    const user = await this.userService.findById(userId);
    this.smsService
      .sendVerificationSms(`+${existing.target}`, otp, user.displayName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to resend SMS: ${error.message}`);
      });
    this.logger.log(`Resent OTP for user ${userId}`);
    return { success: true, expiresAt };
  }
}
