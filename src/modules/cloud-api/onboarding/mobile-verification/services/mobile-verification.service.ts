import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, extractCountryFromPhone, NotFoundException, normalizePhoneNumber } from '@vritti/api-sdk';
import { type Verification } from '@/db/schema';
import { VerificationChannelValues, type VerificationChannel } from '@/db/schema/enums';
import { TIME_CONSTANTS } from '../../../../../constants/time-constants';
import { UserService } from '../../../user/services/user.service';
import { OtpService } from '../../../verification/services/otp.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { MobileVerificationEvent, VERIFICATION_EVENTS } from '../events/verification.events';
import { VerificationProviderFactory } from '../providers';
import { MobileVerificationRepository } from '../repositories/mobile-verification.repository';
import { mapToFrontendMethod, mapToInternalChannel } from '../utils/method-mapping.util';

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

    // Map frontend method to internal channel enum
    const channel = mapToInternalChannel(dto.method);

    if (channel === VerificationChannelValues.SMS_OUT && !dto.phone) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    if (dto.phone) {
      const phoneAlreadyUsed = await this.mobileVerificationRepository.isPhoneVerifiedByOtherUser(dto.phone, userId);
      if (phoneAlreadyUsed) {
        throw new BadRequestException('This phone number is already verified by another user');
      }
    }

    const existingVerification = await this.mobileVerificationRepository.findLatestByUserId(userId);

    if (existingVerification && !existingVerification.isVerified && existingVerification.expiresAt > new Date()) {
      this.logger.log(`Reusing existing verification for user ${userId}: ${existingVerification.verificationId}`);

      return this.buildStatusResponse(existingVerification);
    }

    const normalizedPhone = dto.phone ? normalizePhoneNumber(dto.phone) : null;

    // Generate verification token based on channel type
    const { verificationToken, otpToSend } =
      channel === VerificationChannelValues.SMS_OUT
        ? await this.initiateManualOtpVerification(userId, normalizedPhone!)
        : this.initiateQrVerification();

    const verification = await this.mobileVerificationRepository.create({
      userId,
      channel: channel,
      target: normalizedPhone,
      verificationId: verificationToken,
      isVerified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + this.verificationExpiryMinutes * 60 * 1000),
    });

    this.logger.log(
      `Created mobile verification for user ${userId} with token ${verificationToken} using channel ${channel}`,
    );

    // Send verification message via provider
    if (dto.phone && dto.phoneCountry) {
      await this.sendVerificationMessage(channel, dto.phone, dto.phoneCountry, verificationToken, otpToSend);
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

    if (verification.target) {
      const normalizedStoredPhone = normalizePhoneNumber(verification.target);
      if (normalizedWebhookPhone !== normalizedStoredPhone) {
        this.logger.warn(`Phone number mismatch. Expected: ${normalizedStoredPhone}, Got: ${normalizedWebhookPhone}`);
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

    const countryCode = extractCountryFromPhone(phoneToUse);

    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, phoneToUse, countryCode);

    this.logger.log(
      `Successfully verified phone ${phoneToUse} (country: ${countryCode}) for user ${verification.userId} - advancing to MFA setup`,
    );

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

    if (verification.channel !== VerificationChannelValues.SMS_OUT) {
      this.logger.warn(`Invalid verification channel for OTP: ${verification.channel}`);
      throw new BadRequestException(
        'This verification does not support OTP entry. Please use the correct verification method.',
      );
    }

    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for user: ${userId}`);
      throw new BadRequestException('Phone number already verified');
    }

    // Verify OTP via unified verification service (handles bcrypt validation, expiry, attempts)
    if (!verification.verificationId) {
      throw new BadRequestException('Verification token not found');
    }

    await this.verificationService.verifyOtp(verification.verificationId, userId, otp);

    await this.mobileVerificationRepository.markAsVerified(verification.id);

    if (!verification.target) {
      throw new BadRequestException('Phone number is required for OTP verification');
    }

    const countryCode = extractCountryFromPhone(verification.target);

    await this.userService.markPhoneVerifiedAndAdvanceToMfa(verification.userId, verification.target, countryCode);

    this.logger.log(
      `Successfully verified phone ${verification.target} (country: ${countryCode}) for user ${verification.userId} via OTP - advancing to MFA setup`,
    );

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

  private buildStatusResponse(verification: Verification): MobileVerificationStatusResponseDto {
    const isExpired = verification.expiresAt < new Date();

    let instructions: string | undefined;
    if (!verification.isVerified && !isExpired && verification.verificationId) {
      try {
        const provider = this.verificationProviderFactory.getProvider(verification.channel as VerificationChannel);
        instructions = provider.getInstructions(verification.verificationId, verification.target || undefined);
      } catch {
        instructions = `Use the verification code "${verification.verificationId}" to verify your phone number.`;
      }
    }

    return {
      verificationId: verification.id,
      method: mapToFrontendMethod(verification.channel as VerificationChannel),
      verificationToken: verification.verificationId || undefined,
      isVerified: verification.isVerified,
      phone: verification.target,
      phoneCountry: verification.target ? extractCountryFromPhone(verification.target) : undefined,
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

  // Creates a unified verification record with bcrypt-hashed OTP for manual SMS verification
  private async initiateManualOtpVerification(
    userId: string,
    normalizedPhone: string,
  ): Promise<{ verificationToken: string; otpToSend: string }> {
    const result = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.SMS_OUT,
      normalizedPhone,
    );

    return {
      verificationToken: result.verificationId,
      otpToSend: result.otp,
    };
  }

  // Generates a QR verification token for WhatsApp or SMS QR-based verification
  private initiateQrVerification(): { verificationToken: string; otpToSend: undefined } {
    const verificationToken = this.otpService.generateVerificationToken();

    return {
      verificationToken,
      otpToSend: undefined,
    };
  }

  // Sends verification message via the appropriate provider (WhatsApp, SMS, or manual OTP)
  private async sendVerificationMessage(
    channel: VerificationChannel,
    phone: string,
    phoneCountry: string,
    verificationToken: string,
    otpToSend: string | undefined,
  ): Promise<void> {
    const provider = this.verificationProviderFactory.getProvider(channel);
    const messageToSend = otpToSend || verificationToken;

    provider.sendVerification(phone, phoneCountry, messageToSend).catch((error) => {
      this.logger.error(`Failed to send verification message: ${error.message}`);
      // Don't throw - user can still verify manually via QR
    });
  }
}
