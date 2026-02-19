import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, extractCountryFromPhone, NotFoundException, normalizePhoneNumber } from '@vritti/api-sdk';
import { type Verification } from '@/db/schema';
import { VerificationChannelValues, type VerificationChannel } from '@/db/schema/enums';
import { TIME_CONSTANTS } from '../../../../../constants/time-constants';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { MobileVerificationEvent, VERIFICATION_EVENTS } from '../events/verification.events';
import { VerificationProviderFactory } from '../providers';
import { mapToFrontendMethod, mapToInternalChannel } from '../utils/method-mapping.util';

@Injectable()
export class MobileVerificationService {
  private readonly logger = new Logger(MobileVerificationService.name);
  private readonly whatsappBusinessNumber: string;

  constructor(
    private readonly verificationProviderFactory: VerificationProviderFactory,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
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
      const phoneAlreadyUsed = await this.verificationService.isTargetVerifiedByOtherUser(dto.phone, userId);
      if (phoneAlreadyUsed) {
        throw new BadRequestException('This phone number is already verified by another user');
      }
    }

    const normalizedPhone = dto.phone ? normalizePhoneNumber(dto.phone) : null;

    // Generate verification token based on channel type
    const { verificationToken, otpToSend, hashedOtp } =
      channel === VerificationChannelValues.SMS_OUT
        ? await this.initiateManualOtpVerification(userId, normalizedPhone!)
        : this.initiateQrVerification();

    // Upsert verification record (update existing or create new)
    const verification = await this.verificationService.upsertByUserIdAndChannel(userId, channel, {
      target: normalizedPhone,
      verificationId: channel !== VerificationChannelValues.SMS_OUT ? verificationToken : undefined,
      hashedOtp: channel === VerificationChannelValues.SMS_OUT ? hashedOtp : undefined,
      expiresAt: new Date(Date.now() + TIME_CONSTANTS.MOBILE_VERIFICATION_EXPIRY_MINUTES * 60 * 1000),
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
  async verifyFromWebhook(
    verificationToken: string,
    phoneNumber: string,
    channel: VerificationChannel,
  ): Promise<boolean> {
    const normalizedToken = verificationToken.toUpperCase().trim();

    const verification = await this.verificationService.findByVerificationIdAndChannel(normalizedToken, channel);

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

    const phoneAlreadyUsed = await this.verificationService.isTargetVerifiedByOtherUser(
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
        await this.verificationService.incrementAttempts(verification.id);

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
      await this.verificationService.updateTarget(verification.id, normalizedWebhookPhone);
    }

    await this.verificationService.markAsVerified(verification.id);

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
    const verification = await this.verificationService.findByUserIdAndChannel(
      userId,
      VerificationChannelValues.SMS_OUT,
    );

    if (!verification) {
      this.logger.warn(`No SMS_OUT verification found for user: ${userId}`);
      throw new NotFoundException('No pending verification found. Please initiate verification first.');
    }

    if (verification.isVerified) {
      this.logger.warn(`Verification already completed for user: ${userId}`);
      throw new BadRequestException('Phone number already verified');
    }

    // Verify OTP via unified verification service (handles bcrypt validation, expiry, attempts)
    if (!verification.verificationId) {
      throw new BadRequestException('Verification token not found');
    }

    await this.verificationService.validateOtp(verification.verificationId, userId, otp);

    await this.verificationService.markAsVerified(verification.id);

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

    const verification = await this.findLatestMobileVerification(userId);

    if (!verification) {
      throw new NotFoundException('No mobile verification found. Please initiate verification first.');
    }

    return this.buildStatusResponse(verification);
  }

  // Resets verification state and sends a new code (reuses same record via upsert)
  async resendVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    return this.initiateVerification(userId, dto);
  }

  // Retrieves the latest verification record for SSE connection setup
  async findLatestVerification(userId: string): Promise<Verification | undefined> {
    return this.findLatestMobileVerification(userId);
  }

  // Finds the most recent verification across all mobile channels (SMS_OUT, SMS_IN, WHATSAPP_IN)
  private async findLatestMobileVerification(userId: string): Promise<Verification | undefined> {
    const mobileChannels = [
      VerificationChannelValues.SMS_OUT,
      VerificationChannelValues.SMS_IN,
      VerificationChannelValues.WHATSAPP_IN,
    ];

    const verifications = await Promise.all(
      mobileChannels.map((channel) => this.verificationService.findByUserIdAndChannel(userId, channel)),
    );

    return verifications
      .filter((v): v is Verification => v !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  private isExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }

  private isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= TIME_CONSTANTS.MAX_MOBILE_VERIFICATION_ATTEMPTS;
  }

  private buildStatusResponse(verification: Verification): MobileVerificationStatusResponseDto {
    const isQrMethod =
      verification.channel === VerificationChannelValues.WHATSAPP_IN ||
      verification.channel === VerificationChannelValues.SMS_IN;

    const isWhatsApp = verification.channel === VerificationChannelValues.WHATSAPP_IN;

    return {
      success: true,
      message: verification.isVerified
        ? 'Phone number verified successfully'
        : 'Verification initiated successfully',
      verificationCode: isQrMethod ? verification.verificationId || undefined : undefined,
      whatsappNumber: isWhatsApp && this.whatsappBusinessNumber ? this.whatsappBusinessNumber : undefined,
    };
  }

  // Generates OTP and hashes it for manual SMS verification (does not create DB record)
  private async initiateManualOtpVerification(
    userId: string,
    normalizedPhone: string,
  ): Promise<{ verificationToken: string; otpToSend: string; hashedOtp: string }> {
    const otp = this.verificationService.generateOtp();
    const hashedOtp = await this.verificationService.hashOtp(otp);

    // Return verificationToken as empty for SMS_OUT (we use hashedOtp instead)
    return {
      verificationToken: '',
      otpToSend: otp,
      hashedOtp,
    };
  }

  // Generates a QR verification token for WhatsApp or SMS QR-based verification
  private initiateQrVerification(): { verificationToken: string; otpToSend: undefined; hashedOtp: undefined } {
    const verificationToken = this.verificationService.generateVerificationToken();

    return {
      verificationToken,
      otpToSend: undefined,
      hashedOtp: undefined,
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
