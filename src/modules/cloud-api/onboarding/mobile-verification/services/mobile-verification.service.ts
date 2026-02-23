import { Injectable, Logger, type MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, extractCountryFromPhone, normalizePhoneNumber } from '@vritti/api-sdk';
import { concat, finalize, Observable, of } from 'rxjs';
import { type Verification } from '@/db/schema';
import { type VerificationChannel, VerificationChannelValues } from '@/db/schema/enums';
import { SmsService } from '@/services';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { MobileVerificationEvent, VERIFICATION_EVENTS } from '../events/verification.events';
import { mapToInternalChannel } from '../utils/method-mapping.util';
import { SseConnectionService } from './sse-connection.service';

@Injectable()
export class MobileVerificationService {
  private readonly logger = new Logger(MobileVerificationService.name);
  private readonly whatsappBusinessNumber: string;
  private readonly smsBusinessNumber: string;

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly verificationService: VerificationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sseConnectionService: SseConnectionService,
    private readonly smsService: SmsService,
  ) {
    this.whatsappBusinessNumber = this.configService.getOrThrow<string>('WHATSAPP_BUSINESS_NUMBER');
    this.smsBusinessNumber = this.configService.getOrThrow<string>('SMS_BUSINESS_NUMBER');
  }

  // Creates a manual OTP verification record and sends the verification message via SMS
  async initiateVerification(
    userId: string,
    dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    const user = await this.userService.findById(userId);

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

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

    const { otp } = await this.verificationService.createVerification(userId, channel, normalizedPhone);

    this.logger.log(`Created mobile verification for user ${userId} using channel ${channel}`);

    if (channel === VerificationChannelValues.SMS_OUT && dto.phone) {
      this.sendVerificationSms(dto.phone, otp);
    }

    const isQrChannel =
      channel === VerificationChannelValues.WHATSAPP_IN || channel === VerificationChannelValues.SMS_IN;

    return {
      success: true,
      message: isQrChannel ? 'Verification initiated successfully' : 'OTP sent to your mobile number',
      verificationCode: isQrChannel ? otp : undefined,
      whatsappNumber:
        channel === VerificationChannelValues.WHATSAPP_IN && this.whatsappBusinessNumber
          ? this.whatsappBusinessNumber
          : undefined,
    };
  }

  // Initiates QR verification and returns an Observable with the initiated event prepended
  async initiateAndSubscribe(userId: string, channel: VerificationChannel): Promise<Observable<MessageEvent>> {
    const result = await this.initiateQrVerification(userId, channel);

    const subject = this.sseConnectionService.getOrCreateConnection(userId, result.expiresAt);

    this.scheduleExpiry(userId, result.expiresAt);

    const initiatedEvent: MessageEvent = {
      data: JSON.stringify({
        verificationCode: result.verificationCode,
        instructions: result.instructions,
        expiresAt: result.expiresAt,
        recipientNumber: result.recipientNumber,
      }),
      type: 'initiated',
    };

    return concat(of(initiatedEvent), subject.asObservable()).pipe(
      finalize(() => {
        // Runs on client disconnect (unsubscribe), normal complete, or error — cleans up the connection
        this.sseConnectionService.closeConnection(userId);
      }),
    );
  }

  // Extracts QR-specific logic: validates state, creates verification, returns initiation data
  private async initiateQrVerification(
    userId: string,
    channel: VerificationChannel,
  ): Promise<{ verificationCode: string; instructions: string; expiresAt: Date; recipientNumber: string }> {
    const user = await this.userService.findById(userId);

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    if (channel !== VerificationChannelValues.WHATSAPP_IN && channel !== VerificationChannelValues.SMS_IN) {
      throw new BadRequestException('This endpoint only supports INBOUND verification channels');
    }

    const { otp, expiresAt } = await this.verificationService.createVerification(userId, channel, null);

    this.logger.log(`Created QR verification for user ${userId} using channel ${channel}`);

    const isWhatsApp = channel === VerificationChannelValues.WHATSAPP_IN;

    const instructions = isWhatsApp
      ? `Send the code to our WhatsApp number to verify your phone`
      : `Send the code via SMS to our number to verify your phone`;

    const recipientNumber = isWhatsApp ? this.whatsappBusinessNumber : this.smsBusinessNumber;

    return {
      verificationCode: otp,
      instructions,
      expiresAt,
      recipientNumber: recipientNumber,
    };
  }

  // Schedules an expiry event to be emitted when the verification window closes
  private scheduleExpiry(userId: string, expiresAt: Date): void {
    const timeoutMs = Math.max(0, expiresAt.getTime() - Date.now());

    const timer = setTimeout(() => {
      if (this.sseConnectionService.hasConnection(userId)) {
        this.eventEmitter.emit(
          VERIFICATION_EVENTS.MOBILE_EXPIRED,
          new MobileVerificationEvent(
            userId,
            '',
            'expired',
            undefined,
            'Your verification code has expired. Please try again with a new code.',
          ),
        );
      }
    }, timeoutMs);

    this.sseConnectionService.registerExpiryTimer(userId, timer);
  }

  // Processes an inbound webhook token, validates the phone, and marks verification complete
  async verifyFromWebhook(
    verificationToken: string,
    phoneNumber: string,
    channel: VerificationChannel,
  ): Promise<boolean> {
    const normalizedToken = verificationToken.toUpperCase().trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    let verification: Verification;
    try {
      verification = await this.verificationService.verifyVerification(normalizedToken, channel);
    } catch {
      this.logger.warn(`Verification failed for token: ${verificationToken}`);
      return false;
    }

    const alreadyUsed = await this.verificationService.isTargetVerifiedByOtherUser(
      normalizedPhone,
      verification.userId,
    );
    if (alreadyUsed) {
      this.logger.warn(`Phone ${normalizedPhone} is already verified by another user`);
      this.eventEmitter.emit(
        VERIFICATION_EVENTS.MOBILE_FAILED,
        new MobileVerificationEvent(
          verification.userId,
          verification.id,
          'failed',
          normalizedPhone,
          'This phone number is already verified by another account',
        ),
      );
      return false;
    }

    const phoneToUse = verification.target ?? normalizedPhone;
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

  // Validates a manually-entered OTP against the stored hash and advances the user to MFA setup
  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    const verification = await this.verificationService.verifyVerification(
      otp,
      VerificationChannelValues.SMS_OUT,
      userId,
    );

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

  // Sends the OTP via SMS to the user's phone number
  private sendVerificationSms(phone: string, otp: string): void {
    this.smsService.sendVerificationSms(phone, otp).catch((error: Error) => {
      this.logger.error(`Failed to send verification SMS: ${error.message}`);
    });
  }
}
