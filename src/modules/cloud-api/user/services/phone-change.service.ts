import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException, normalizePhoneNumber } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import * as crypto from 'crypto';
import { mobileVerifications } from '@/db/schema';
import { SmsService } from '@/services';
import { MobileVerificationRepository } from '../../onboarding/repositories/mobile-verification.repository';
import { OtpService } from '../../onboarding/services/otp.service';
import { UserService } from '../user.service';
import { PhoneChangeRequestRepository } from '../repositories/phone-change-request.repository';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class PhoneChangeService {
  private readonly logger = new Logger(PhoneChangeService.name);
  private readonly REVERT_TOKEN_EXPIRY_HOURS = 72;

  constructor(
    private readonly phoneChangeRequestRepo: PhoneChangeRequestRepository,
    private readonly mobileVerificationRepo: MobileVerificationRepository,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
    private readonly userService: UserService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  /**
   * Step 1: Request identity verification
   * Send OTP to current phone to confirm user identity
   */
  async requestIdentityVerification(userId: string): Promise<{ verificationId: string; expiresAt: Date }> {
    // Get user details
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

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otp);

    // Create verification record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const verification = await this.mobileVerificationRepo.create({
      userId,
      phone: user.phone,
      phoneCountry: user.phoneCountry || null,
      method: 'MANUAL_OTP',
      otp: hashedOtp,
      qrVerificationId: null,
      isVerified: false,
      attempts: 0,
      expiresAt,
    });

    // Send OTP to current phone (fire and forget)
    this.smsService
      .sendVerificationSms(`+${user.phone}`, otp, user.firstName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send SMS to ${user.phone}: ${error.message}`);
      });

    this.logger.log(`Identity verification OTP sent to ${user.phone} for user ${userId}`);

    return {
      verificationId: verification.id,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Step 2: Verify identity
   * Verify OTP sent to current phone and create change request
   */
  async verifyIdentity(
    userId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ changeRequestId: string; changeRequestsToday: number }> {
    // Find verification
    const verification = await this.mobileVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException({
        label: 'Verification Not Found',
        detail: 'The verification code you provided is invalid or has expired.',
      });
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(verification);

    // Verify OTP
    if (!verification.otp) {
      throw new BadRequestException({
        label: 'OTP Not Found',
        detail: 'No OTP was found for this verification.',
      });
    }

    const isValid = await this.otpService.verifyOtp(otpCode, verification.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.mobileVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The verification code you entered is incorrect. Please check the code and try again.',
        errors: [
          {
            field: 'code',
            message: 'Invalid verification code',
          },
        ],
      });
    }

    // Mark verification as complete
    await this.mobileVerificationRepo.markAsVerified(verification.id);

    // Check rate limit
    const { requestsToday } = await this.rateLimitService.checkAndIncrementChangeRequestLimit(userId, 'phone');

    // Get user details
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
      identityVerificationId: verification.id,
      isCompleted: false,
    });

    this.logger.log(`Identity verified for phone change request ${changeRequest.id} by user ${userId}`);

    return {
      changeRequestId: changeRequest.id,
      changeRequestsToday: requestsToday,
    };
  }

  /**
   * Step 3: Submit new phone
   * Validate new phone and send verification OTP
   */
  async submitNewPhone(
    userId: string,
    changeRequestId: string,
    newPhone: string,
    newPhoneCountry: string,
  ): Promise<{ verificationId: string; expiresAt: Date }> {
    // Find change request
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

    // Check if new phone is same as current
    if (normalizedNewPhone === normalizedOldPhone) {
      throw new BadRequestException({
        label: 'Same Phone Number',
        detail: 'Please enter a different phone number than your current one.',
      });
    }

    // Check if new phone is already in use by another user
    const phoneInUse = await this.mobileVerificationRepo.isPhoneVerifiedByOtherUser(normalizedNewPhone, userId);
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

    // Delete any existing verifications for this new phone
    await this.mobileVerificationRepo.deleteMany(eq(mobileVerifications.phone, normalizedNewPhone));

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otp);

    // Create verification record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const verification = await this.mobileVerificationRepo.create({
      userId,
      phone: normalizedNewPhone,
      phoneCountry: newPhoneCountry,
      method: 'MANUAL_OTP',
      otp: hashedOtp,
      qrVerificationId: null,
      isVerified: false,
      attempts: 0,
      expiresAt,
    });

    // Update change request with new phone verification ID
    await this.phoneChangeRequestRepo.update(changeRequest.id, {
      newPhoneVerificationId: verification.id,
    });

    // Send OTP to new phone (fire and forget)
    const user = await this.userService.findById(userId);
    this.smsService
      .sendVerificationSms(`+${normalizedNewPhone}`, otp, user.firstName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send SMS to ${normalizedNewPhone}: ${error.message}`);
      });

    this.logger.log(`Verification OTP sent to new phone for change request ${changeRequest.id}`);

    return {
      verificationId: verification.id,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Step 4: Verify new phone
   * Verify OTP sent to new phone and complete the change
   */
  async verifyNewPhone(
    userId: string,
    changeRequestId: string,
    verificationId: string,
    otpCode: string,
  ): Promise<{ success: boolean; revertToken: string; revertExpiresAt: Date; newPhone: string }> {
    // Find change request
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

    // Find verification
    const verification = await this.mobileVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException({
        label: 'Verification Not Found',
        detail: 'The verification code you provided is invalid or has expired.',
      });
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(verification);

    // Verify OTP
    if (!verification.otp) {
      throw new BadRequestException({
        label: 'OTP Not Found',
        detail: 'No OTP was found for this verification.',
      });
    }

    const isValid = await this.otpService.verifyOtp(otpCode, verification.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.mobileVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The verification code you entered is incorrect. Please check the code and try again.',
        errors: [
          {
            field: 'code',
            message: 'Invalid verification code',
          },
        ],
      });
    }

    // Mark verification as complete
    await this.mobileVerificationRepo.markAsVerified(verification.id);

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

    // Get user details for notification
    const user = await this.userService.findById(userId);

    // Send notification to old phone with revert instructions (fire and forget)
    const revertMessage = `Hello${user.firstName ? ` ${user.firstName}` : ''}, your Vritti phone number was changed. If this wasn't you, use this token to revert within 72 hours: ${revertToken}`;
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

  /**
   * Revert phone change using revert token
   */
  async revertChange(revertToken: string): Promise<{ success: boolean; revertedPhone: string }> {
    // Find change request by revert token
    const changeRequest = await this.phoneChangeRequestRepo.findCompletedByRevertToken(revertToken);

    if (!changeRequest) {
      throw new BadRequestException({
        label: 'Invalid Revert Token',
        detail: 'The revert token you used is invalid or has expired. Please contact support if you need assistance.',
      });
    }

    // Check token not expired
    if (changeRequest.revertExpiresAt && new Date() > changeRequest.revertExpiresAt) {
      throw new BadRequestException({
        label: 'Revert Token Expired',
        detail: 'The revert token has expired. You can no longer revert this phone change. Please contact support if you need assistance.',
      });
    }

    // Check not already reverted
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

    // Mark as reverted
    await this.phoneChangeRequestRepo.markAsReverted(changeRequest.id);

    // Get user details for confirmation SMS
    const user = await this.userService.findById(changeRequest.userId);

    // Send confirmation SMS to restored phone (fire and forget)
    const confirmMessage = `Hello${user.firstName ? ` ${user.firstName}` : ''}, your Vritti phone number has been successfully restored to this number.`;
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

  /**
   * Resend OTP for phone verification
   */
  async resendOtp(userId: string, verificationId: string): Promise<{ success: boolean; expiresAt: Date }> {
    // Find verification
    const verification = await this.mobileVerificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new BadRequestException({
        label: 'Verification Not Found',
        detail: 'The verification you are trying to resend is invalid or has expired.',
      });
    }

    if (verification.isVerified) {
      throw new BadRequestException({
        label: 'Verification Already Completed',
        detail: 'This verification has already been completed.',
      });
    }

    if (!verification.phone) {
      throw new BadRequestException({
        label: 'Phone Number Not Found',
        detail: 'No phone number is associated with this verification.',
      });
    }

    // Delete old verification
    await this.mobileVerificationRepo.delete(verification.id);

    // Generate new OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otp);

    // Create new verification record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const newVerification = await this.mobileVerificationRepo.create({
      userId,
      phone: verification.phone,
      phoneCountry: verification.phoneCountry,
      method: 'MANUAL_OTP',
      otp: hashedOtp,
      qrVerificationId: null,
      isVerified: false,
      attempts: 0,
      expiresAt,
    });

    // Send new OTP (fire and forget)
    const user = await this.userService.findById(userId);
    this.smsService
      .sendVerificationSms(`+${verification.phone}`, otp, user.firstName ?? undefined)
      .catch((error) => {
        this.logger.error(`Failed to send SMS to ${verification.phone}: ${error.message}`);
      });

    this.logger.log(`Resent OTP for user ${userId} to ${verification.phone}`);

    return {
      success: true,
      expiresAt: newVerification.expiresAt,
    };
  }
}
