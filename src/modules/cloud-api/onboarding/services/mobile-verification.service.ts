import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, extractCountryFromPhone, normalizePhoneNumber } from '@vritti/api-sdk';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type MobileVerification } from '@/db/schema';
import { UserService } from '../../user/user.service';
import { InitiateMobileVerificationDto } from '../dto/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/mobile-verification-status-response.dto';
import { VerificationProviderFactory } from '../providers';
import { VERIFICATION_EVENTS, MobileVerificationEvent } from '../events/verification.events';
import { MobileVerificationRepository } from '../repositories/mobile-verification.repository';
import { OtpService } from './otp.service';
import { TIME_CONSTANTS } from '../../../../constants/time-constants';

/**
 * Mobile Verification Service
 * Handles phone number verification via multiple methods (WhatsApp, SMS)
 */
@Injectable()
export class MobileVerificationService {
  private readonly logger = new Logger(MobileVerificationService.name);
  private readonly verificationExpiryMinutes = TIME_CONSTANTS.MOBILE_VERIFICATION_EXPIRY_MINUTES;
  private readonly maxAttempts = TIME_CONSTANTS.MAX_MOBILE_VERIFICATION_ATTEMPTS;
  private readonly whatsappBusinessNumber: string;

  constructor(
    private readonly mobileVerificationRepository: MobileVerificationRepository,
    private readonly verificationProviderFactory: VerificationProviderFactory,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.whatsappBusinessNumber = this.configService.get<string>('WHATSAPP_BUSINESS_NUMBER') || '';
  }

  /**
   * Initiate mobile verification for a user
   * Generates a verification token and sends it via the selected provider
   *
   * For QR-based methods (WHATSAPP_QR, SMS_QR): phone is optional - comes from webhook
   * For OTP-based method (MANUAL_OTP): phone is required - OTP sent to phone
   *
   * @param userId User ID
   * @param dto Initiation DTO with optional phone number and method
   * @returns Verification status with token
   */
  async initiateVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    const user = await this.userService.findById(userId);

    // Check if already verified
    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    // Determine verification method (default to WHATSAPP_QR for backward compatibility)
    const method = (dto.method || VerificationMethodValues.WHATSAPP_QR) as VerificationMethod;

    // For MANUAL_OTP, phone is required (we send OTP to their phone)
    if (method === VerificationMethodValues.MANUAL_OTP && !dto.phone) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    // Check if phone is already verified by another user (only if phone provided)
    if (dto.phone) {
      const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(dto.phone, userId);
      if (phoneAlreadyUsed) {
        throw new BadRequestException('This phone number is already verified by another user');
      }
    }

    // Get the appropriate provider
    const provider = this.verificationProviderFactory.getProvider(method);

    // Check for existing pending verification
    const existingVerification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    // If exists and not expired, return existing token
    if (existingVerification && !existingVerification.isVerified && existingVerification.expiresAt > new Date()) {
      this.logger.log(
        `Reusing existing verification for user ${userId}: ${existingVerification.qrVerificationId}`,
      );

      return this.buildStatusResponse(existingVerification);
    }

    // Generate appropriate token based on method
    // MANUAL_OTP: 6-digit numeric OTP for SMS
    // QR methods: Text token like "VERABC123"
    const verificationToken =
      method === VerificationMethodValues.MANUAL_OTP
        ? this.otpService.generateOtp()
        : this.otpService.generateVerificationToken();

    // Create verification record
    // For QR methods: phone may be null (will come from webhook)
    // For OTP method: phone is required and normalized
    const normalizedPhone = dto.phone ? normalizePhoneNumber(dto.phone) : null;
    const verification = await this.mobileVerificationRepository.create({
      userId,
      phone: normalizedPhone,
      phoneCountry: dto.phoneCountry || null,
      method: method,
      qrVerificationId: verificationToken,
      isVerified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + this.verificationExpiryMinutes * 60 * 1000),
    });

    this.logger.log(`Created mobile verification for user ${userId} with token ${verificationToken} using method ${method}`);

    // Send verification message via provider only if phone is provided (fire and forget)
    if (dto.phone && dto.phoneCountry) {
      provider.sendVerification(dto.phone, dto.phoneCountry, verificationToken).catch((error) => {
        this.logger.error(`Failed to send verification message: ${error.message}`);
        // Don't throw - user can still verify manually via QR
      });
    }

    return this.buildStatusResponse(verification);
  }

  /**
   * Verify mobile number from WhatsApp/SMS webhook
   * Called when user sends verification token via WhatsApp or SMS
   *
   * For QR-based flow: phone may not be stored yet, so we accept phone from webhook
   * For cases where phone was provided: verify it matches
   *
   * @param verificationToken Token sent by user
   * @param phoneNumber Phone number from webhook (E.164 format without +)
   * @returns true if verification successful
   */
  async verifyFromWebhook(verificationToken: string, phoneNumber: string): Promise<boolean> {
    // Normalize token to uppercase for case-insensitive lookup
    const normalizedToken = verificationToken.toUpperCase().trim();

    // Find verification by token
    const verification = await this.mobileVerificationRepository.findByVerificationId(normalizedToken);

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
    if (this.isExpired(verification.expiresAt)) {
      this.logger.warn(`Verification expired for token: ${verificationToken}`);
      return false;
    }

    // Check max attempts
    if (this.isMaxAttemptsExceeded(verification.attempts)) {
      this.logger.warn(`Max attempts exceeded for verification: ${verification.id}`);
      return false;
    }

    // Normalize phone number from webhook
    const normalizedWebhookPhone = normalizePhoneNumber(phoneNumber);

    // Check if this phone is already verified by another user
    const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(
      normalizedWebhookPhone,
      verification.userId,
    );
    if (phoneAlreadyUsed) {
      this.logger.warn(`Phone ${normalizedWebhookPhone} is already verified by another user`);
      return false;
    }

    // Handle phone verification based on whether phone was provided during initiation
    let phoneToUse = normalizedWebhookPhone;

    if (verification.phone) {
      // Phone was provided during initiation - verify it matches
      const normalizedStoredPhone = normalizePhoneNumber(verification.phone);
      if (normalizedWebhookPhone !== normalizedStoredPhone) {
        this.logger.warn(
          `Phone number mismatch. Expected: ${normalizedStoredPhone}, Got: ${normalizedWebhookPhone}`,
        );
        // Increment attempts on mismatch
        await this.mobileVerificationRepository.incrementAttempts(verification.id);

        // Emit SSE event for phone mismatch failure
        this.eventEmitter.emit(
          VERIFICATION_EVENTS.MOBILE_FAILED,
          new MobileVerificationEvent(
            verification.userId,
            verification.id,
            'failed',
            undefined,
            'Phone number does not match the one provided during verification',
          ),
        );

        return false;
      }
      phoneToUse = normalizedStoredPhone;
    } else {
      // Phone was not provided during initiation (QR flow) - accept phone from webhook
      this.logger.log(`Accepting phone ${normalizedWebhookPhone} from webhook for QR-based verification`);
      // Update verification record with the phone from webhook
      await this.mobileVerificationRepository.updatePhone(verification.id, normalizedWebhookPhone);
    }

    // Mark as verified
    await this.mobileVerificationRepository.markAsVerified(verification.id);

    // Determine country code - use stored value or extract from phone number
    const countryCode = verification.phoneCountry || extractCountryFromPhone(phoneToUse);

    // Mark phone verified and advance to MFA setup step
    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, phoneToUse, countryCode);

    this.logger.log(`Successfully verified phone ${phoneToUse} (country: ${countryCode}) for user ${verification.userId} - advancing to MFA setup`);

    // Emit SSE event for real-time notification
    this.eventEmitter.emit(
      VERIFICATION_EVENTS.MOBILE_VERIFIED,
      new MobileVerificationEvent(
        verification.userId,
        verification.id,
        'verified',
        phoneToUse,
        'Phone number verified successfully',
      ),
    );

    return true;
  }

  /**
   * Verify OTP for SMS OTP verification method
   * Called when user enters OTP received via SMS
   *
   * @param userId User ID
   * @param otp OTP entered by user
   * @returns true if verification successful
   */
  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    // Find the latest verification for the user
    const verification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (!verification) {
      this.logger.warn(`No verification found for user: ${userId}`);
      throw new NotFoundException('No pending verification found. Please initiate verification first.');
    }

    // Validate it's MANUAL_OTP method (the only OTP-based method)
    if (verification.method !== VerificationMethodValues.MANUAL_OTP) {
      this.logger.warn(`Invalid verification method for OTP: ${verification.method}`);
      throw new BadRequestException(
        'This verification does not support OTP entry. Please use the correct verification method.',
      );
    }

    // Check if already verified
    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for user: ${userId}`);
      throw new BadRequestException('Phone number already verified');
    }

    // Check expiry
    if (this.isExpired(verification.expiresAt)) {
      this.logger.warn(`Verification expired for user: ${userId}`);
      throw new BadRequestException('Verification expired. Please request a new verification.');
    }

    // Check max attempts
    if (this.isMaxAttemptsExceeded(verification.attempts)) {
      this.logger.warn(`Max attempts exceeded for verification: ${verification.id}`);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new verification.');
    }

    // Validate the OTP matches (case-insensitive)
    const normalizedOtp = otp.toUpperCase().trim();
    const storedToken = verification.qrVerificationId?.toUpperCase().trim();

    if (normalizedOtp !== storedToken) {
      this.logger.warn(`OTP mismatch for user ${userId}. Expected: ${storedToken}, Got: ${normalizedOtp}`);
      // Increment attempts on mismatch
      await this.mobileVerificationRepository.incrementAttempts(verification.id);
      throw new BadRequestException({
        label: 'Invalid Code',
        detail: 'Invalid OTP. Please try again.',
        errors: [
          {
            field: 'code',
            message: 'Invalid OTP',
          },
        ],
      });
    }

    // Mark as verified
    await this.mobileVerificationRepository.markAsVerified(verification.id);

    // For MANUAL_OTP, phone is always required during initiation, so it should be present
    if (!verification.phone) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    // Determine country code - use stored value or extract from phone number
    const countryCode = verification.phoneCountry || extractCountryFromPhone(verification.phone);

    // Mark phone verified and advance to MFA setup step
    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, verification.phone, countryCode);

    this.logger.log(`Successfully verified phone ${verification.phone} (country: ${countryCode}) for user ${verification.userId} via OTP - advancing to MFA setup`);

    return true;
  }

  /**
   * Get verification status for a user
   *
   * @param userId User ID
   * @returns Verification status
   */
  async getVerificationStatus(userId: string): Promise<MobileVerificationStatusResponseDto> {
    // Validate user exists (findById throws NotFoundException if not found)
    await this.userService.findById(userId);

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
   * Check if verification has expired
   */
  private isExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }

  /**
   * Check if max verification attempts exceeded
   */
  private isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.maxAttempts;
  }

  /**
   * Build status response DTO with dynamic instructions based on verification method
   */
  private buildStatusResponse(verification: MobileVerification): MobileVerificationStatusResponseDto {
    const isExpired = verification.expiresAt < new Date();

    // Get dynamic instructions from the provider
    let instructions: string | undefined;
    if (!verification.isVerified && !isExpired && verification.qrVerificationId) {
      try {
        const provider = this.verificationProviderFactory.getProvider(verification.method as VerificationMethod);
        instructions = provider.getInstructions(verification.qrVerificationId, verification.phone || undefined);
      } catch {
        // Fallback to generic instructions if provider not available
        instructions = `Use the verification code "${verification.qrVerificationId}" to verify your phone number.`;
      }
    }

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
      instructions: verification.isVerified ? undefined : instructions,
      // Include WhatsApp business number for QR-based methods
      whatsappNumber: this.whatsappBusinessNumber || undefined,
    };
  }
}
