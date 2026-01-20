import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WhatsAppService } from '@/services';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type MobileVerification } from '@/db/schema';
import { UserService } from '../../user/user.service';
import { InitiateMobileVerificationDto } from '../dto/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/mobile-verification-status-response.dto';
import { MobileVerificationRepository } from '../repositories/mobile-verification.repository';

/**
 * Mobile Verification Service
 * Handles WhatsApp-based phone number verification
 */
@Injectable()
export class MobileVerificationService {
  private readonly logger = new Logger(MobileVerificationService.name);
  private readonly verificationExpiryMinutes = 10; // 10 minutes
  private readonly maxAttempts = 5;

  constructor(
    private readonly mobileVerificationRepository: MobileVerificationRepository,
    private readonly whatsappService: WhatsAppService,
    private readonly userService: UserService,
  ) {}

  /**
   * Initiate mobile verification for a user
   * Generates a verification token and sends it via WhatsApp
   *
   * @param userId User ID
   * @param dto Initiation DTO with phone number and optional method
   * @returns Verification status with token
   */
  async initiateVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    // Check if phone is already verified by another user
    const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(dto.phone, userId);
    if (phoneAlreadyUsed) {
      throw new BadRequestException('This phone number is already verified by another user');
    }

    // Check for existing pending verification
    const existingVerification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    // If exists and not expired, return existing token
    if (existingVerification && !existingVerification.isVerified && existingVerification.expiresAt > new Date()) {
      this.logger.log(
        `Reusing existing verification for user ${userId}: ${existingVerification.qrVerificationId}`,
      );

      return this.buildStatusResponse(existingVerification);
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();

    // Create verification record
    const verification = await this.mobileVerificationRepository.create({
      userId,
      phone: dto.phone,
      phoneCountry: dto.phoneCountry,
      method: (dto.method || VerificationMethodValues.WHATSAPP_QR) as VerificationMethod,
      qrVerificationId: verificationToken,
      isVerified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + this.verificationExpiryMinutes * 60 * 1000),
    });

    this.logger.log(`Created mobile verification for user ${userId} with token ${verificationToken}`);

    // Send WhatsApp message (fire and forget)
    this.whatsappService.sendVerificationMessage(dto.phone, verificationToken).catch((error) => {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      // Don't throw - user can still verify manually by sending the token to WhatsApp
    });

    return this.buildStatusResponse(verification);
  }

  /**
   * Verify mobile number from WhatsApp webhook
   * Called when user sends verification token via WhatsApp
   *
   * @param verificationToken Token sent by user
   * @param phoneNumber Phone number from webhook (E.164 format without +)
   * @returns true if verification successful
   */
  async verifyFromWebhook(verificationToken: string, phoneNumber: string): Promise<boolean> {
    // Find verification by token
    const verification = await this.mobileVerificationRepository.findByVerificationId(verificationToken);

    if (!verification) {
      this.logger.warn(`Verification not found for token: ${verificationToken}`);
      return false;
    }

    // Check if already verified
    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for token: ${verificationToken}`);
      return false;
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      this.logger.warn(`Verification expired for token: ${verificationToken}`);
      return false;
    }

    // Check max attempts
    if (verification.attempts >= this.maxAttempts) {
      this.logger.warn(`Max attempts exceeded for verification: ${verification.id}`);
      return false;
    }

    // Normalize phone number from webhook
    const normalizedWebhookPhone = this.whatsappService.normalizePhoneNumber(phoneNumber);

    // Verify the phone number matches
    const normalizedStoredPhone = this.whatsappService.normalizePhoneNumber(verification.phone);
    if (normalizedWebhookPhone !== normalizedStoredPhone) {
      this.logger.warn(
        `Phone number mismatch. Expected: ${normalizedStoredPhone}, Got: ${normalizedWebhookPhone}`,
      );
      // Increment attempts on mismatch
      await this.mobileVerificationRepository.incrementAttempts(verification.id);
      return false;
    }

    // Mark as verified
    await this.mobileVerificationRepository.markAsVerified(verification.id);

    // Update user
    await this.userService.markPhoneVerified(verification.userId, verification.phone, verification.phoneCountry);

    this.logger.log(`Successfully verified phone ${verification.phone} for user ${verification.userId}`);

    return true;
  }

  /**
   * Get verification status for a user
   *
   * @param userId User ID
   * @returns Verification status
   */
  async getVerificationStatus(userId: string): Promise<MobileVerificationStatusResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const verification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (!verification) {
      throw new NotFoundException('No mobile verification found. Please initiate verification first.');
    }

    return this.buildStatusResponse(verification);
  }

  /**
   * Resend verification (generate new token and send)
   *
   * @param userId User ID
   * @param dto Initiation DTO with phone number
   * @returns New verification status
   */
  async resendVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    // Delete existing pending verification
    const existing = await this.mobileVerificationRepository.findLatestByUserId(userId);
    if (existing && !existing.isVerified) {
      await this.mobileVerificationRepository.delete(existing.id);
    }

    // Create new verification
    return this.initiateVerification(userId, dto);
  }

  /**
   * Generate a short, easy-to-type verification token
   * Format: VERXXXXXX (VER + 6 hex characters)
   */
  private generateVerificationToken(): string {
    const randomBytes = crypto.randomBytes(3);
    const token = randomBytes.toString('hex').toUpperCase();
    return `VER${token}`;
  }

  /**
   * Build status response DTO
   */
  private buildStatusResponse(verification: MobileVerification): MobileVerificationStatusResponseDto {
    const isExpired = verification.expiresAt < new Date();

    return {
      verificationId: verification.id,
      method: verification.method as VerificationMethod,
      verificationToken: verification.qrVerificationId || undefined,
      isVerified: verification.isVerified,
      phone: verification.phone,
      phoneCountry: verification.phoneCountry,
      expiresAt: verification.expiresAt,
      message: verification.isVerified
        ? 'Phone number verified successfully'
        : isExpired
          ? 'Verification expired. Please request a new verification.'
          : 'Waiting for verification',
      instructions: verification.isVerified
        ? undefined
        : `Send the verification code "${verification.qrVerificationId}" to our WhatsApp Business number to verify your phone.`,
    };
  }
}
