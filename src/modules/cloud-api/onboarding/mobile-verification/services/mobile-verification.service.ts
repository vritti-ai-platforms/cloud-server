import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, extractCountryFromPhone, normalizePhoneNumber } from '@vritti/api-sdk';
import { type VerificationMethod, VerificationChannelValues, VerificationMethodValues } from '@/db/schema/enums';
import { type MobileVerification } from '@/db/schema';
import { UserService } from '../../../user/services/user.service';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { VerificationProviderFactory } from '../providers';
import { VERIFICATION_EVENTS, MobileVerificationEvent } from '../events/verification.events';
import { MobileVerificationRepository } from '../repositories/mobile-verification.repository';
import { OtpService } from '../../../verification/services/otp.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { TIME_CONSTANTS } from '../../../../../constants/time-constants';

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
    private readonly verificationService: VerificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.whatsappBusinessNumber = this.configService.get<string>('WHATSAPP_BUSINESS_NUMBER') || '';
  }

  // Creates a verification record, selects the provider, and sends the verification message
  async initiateVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    const user = await this.userService.findById(userId);

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    const method = (dto.method || VerificationMethodValues.WHATSAPP_QR) as VerificationMethod;

    if (method === VerificationMethodValues.MANUAL_OTP && !dto.phone) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    if (dto.phone) {
      const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(dto.phone, userId);
      if (phoneAlreadyUsed) {
        throw new BadRequestException('This phone number is already verified by another user');
      }
    }

    const provider = this.verificationProviderFactory.getProvider(method);

    const existingVerification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (existingVerification && !existingVerification.isVerified && existingVerification.expiresAt > new Date()) {
      this.logger.log(
        `Reusing existing verification for user ${userId}: ${existingVerification.qrVerificationId}`,
      );

      return this.buildStatusResponse(existingVerification);
    }

    const normalizedPhone = dto.phone ? normalizePhoneNumber(dto.phone) : null;
    let verificationToken: string;
    let otpToSend: string | undefined;

    // For MANUAL_OTP: create unified verification record (bcrypt-hashed OTP)
    if (method === VerificationMethodValues.MANUAL_OTP) {
      if (!normalizedPhone) {
        throw new BadRequestException('Phone number is required for OTP verification');
      }
      const result = await this.verificationService.createVerification(
        userId,
        VerificationChannelValues.SMS,
        normalizedPhone,
      );
      verificationToken = result.verificationId;
      otpToSend = result.otp;
    } else {
      // For QR methods: generate QR verification token
      verificationToken = this.otpService.generateVerificationToken();
    }

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

    if (dto.phone && dto.phoneCountry) {
      const messageToSend = otpToSend || verificationToken;
      provider.sendVerification(dto.phone, dto.phoneCountry, messageToSend).catch((error) => {
        this.logger.error(`Failed to send verification message: ${error.message}`);
        // Don't throw - user can still verify manually via QR
      });
    }

    return this.buildStatusResponse(verification);
  }

  // Processes an inbound webhook token, validates the phone, and marks verification complete
  async verifyFromWebhook(verificationToken: string, phoneNumber: string): Promise<boolean> {
    const normalizedToken = verificationToken.toUpperCase().trim();

    const verification = await this.mobileVerificationRepository.findByVerificationId(normalizedToken);

    if (!verification) {
      this.logger.warn(`Verification not found for token: ${verificationToken}`);
      return false;
    }

    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for token: ${verificationToken}`);
      return false;
    }

    if (this.isExpired(verification.expiresAt)) {
      this.logger.warn(`Verification expired for token: ${verificationToken}`);
      return false;
    }
    if (this.isMaxAttemptsExceeded(verification.attempts)) {
      this.logger.warn(`Max attempts exceeded for verification: ${verification.id}`);
      return false;
    }

    const normalizedWebhookPhone = normalizePhoneNumber(phoneNumber);

    const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(
      normalizedWebhookPhone,
      verification.userId,
    );
    if (phoneAlreadyUsed) {
      this.logger.warn(`Phone ${normalizedWebhookPhone} is already verified by another user`);
      return false;
    }

    let phoneToUse = normalizedWebhookPhone;

    if (verification.phone) {
      const normalizedStoredPhone = normalizePhoneNumber(verification.phone);
      if (normalizedWebhookPhone !== normalizedStoredPhone) {
        this.logger.warn(
          `Phone number mismatch. Expected: ${normalizedStoredPhone}, Got: ${normalizedWebhookPhone}`,
        );
        await this.mobileVerificationRepository.incrementAttempts(verification.id);

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
      this.logger.log(`Accepting phone ${normalizedWebhookPhone} from webhook for QR-based verification`);
      await this.mobileVerificationRepository.updatePhone(verification.id, normalizedWebhookPhone);
    }

    await this.mobileVerificationRepository.markAsVerified(verification.id);

    const countryCode = verification.phoneCountry || extractCountryFromPhone(phoneToUse);

    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, phoneToUse, countryCode);

    this.logger.log(`Successfully verified phone ${phoneToUse} (country: ${countryCode}) for user ${verification.userId} - advancing to MFA setup`);

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

  // Validates a manually-entered OTP against the stored verification token
  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    const verification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (!verification) {
      this.logger.warn(`No verification found for user: ${userId}`);
      throw new NotFoundException('No pending verification found. Please initiate verification first.');
    }

    if (verification.method !== VerificationMethodValues.MANUAL_OTP) {
      this.logger.warn(`Invalid verification method for OTP: ${verification.method}`);
      throw new BadRequestException(
        'This verification does not support OTP entry. Please use the correct verification method.',
      );
    }

    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for user: ${userId}`);
      throw new BadRequestException('Phone number already verified');
    }

    // Verify OTP via unified verification service (handles bcrypt validation, expiry, attempts)
    if (!verification.qrVerificationId) {
      throw new BadRequestException('Verification token not found');
    }

    await this.verificationService.verifyOtp(verification.qrVerificationId, userId, otp);

    await this.mobileVerificationRepository.markAsVerified(verification.id);

    if (!verification.phone) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    const countryCode = verification.phoneCountry || extractCountryFromPhone(verification.phone);

    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, verification.phone, countryCode);

    this.logger.log(`Successfully verified phone ${verification.phone} (country: ${countryCode}) for user ${verification.userId} via OTP - advancing to MFA setup`);

    return true;
  }

  // Retrieves the latest mobile verification record and builds a status response
  async getVerificationStatus(userId: string): Promise<MobileVerificationStatusResponseDto> {
    await this.userService.findById(userId);

    const verification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (!verification) {
      throw new NotFoundException('No mobile verification found. Please initiate verification first.');
    }

    return this.buildStatusResponse(verification);
  }

  // Deletes any pending verification and initiates a fresh one
  async resendVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    const existing = await this.mobileVerificationRepository.findLatestByUserId(userId);
    if (existing && !existing.isVerified) {
      await this.mobileVerificationRepository.delete(existing.id);
    }

    return this.initiateVerification(userId, dto);
  }

  private isExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }

  private isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.maxAttempts;
  }

  private buildStatusResponse(verification: MobileVerification): MobileVerificationStatusResponseDto {
    const isExpired = verification.expiresAt < new Date();

    let instructions: string | undefined;
    if (!verification.isVerified && !isExpired && verification.qrVerificationId) {
      try {
        const provider = this.verificationProviderFactory.getProvider(verification.method as VerificationMethod);
        instructions = provider.getInstructions(verification.qrVerificationId, verification.phone || undefined);
      } catch {
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
      whatsappNumber: this.whatsappBusinessNumber || undefined,
    };
  }
}
