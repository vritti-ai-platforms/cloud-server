import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, extractCountryFromPhone, NotFoundException, normalizePhoneNumber } from '@vritti/api-sdk';
import { type Verification } from '@/db/schema';
import { type VerificationChannel, VerificationChannelValues } from '@/db/schema/enums';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { MobileVerificationEvent, VERIFICATION_EVENTS } from '../events/verification.events';
import { VerificationProviderFactory } from '../providers';
import { mapToInternalChannel } from '../utils/method-mapping.util';

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

    if (dto.phone && dto.phoneCountry) {
      await this.sendVerificationMessage(channel, dto.phone, dto.phoneCountry, otp);
    }

    const isQrChannel =
      channel === VerificationChannelValues.WHATSAPP_IN || channel === VerificationChannelValues.SMS_IN;

    return {
      success: true,
      message: 'Verification initiated successfully',
      verificationCode: isQrChannel ? otp : undefined,
      whatsappNumber:
        channel === VerificationChannelValues.WHATSAPP_IN && this.whatsappBusinessNumber
          ? this.whatsappBusinessNumber
          : undefined,
    };
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

    const alreadyUsed = await this.verificationService.isTargetVerifiedByOtherUser(normalizedPhone, verification.userId);
    if (alreadyUsed) {
      this.logger.warn(`Phone ${normalizedPhone} is already verified by another user`);
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

  // Retrieves the latest mobile verification record and builds a status response
  async getVerificationStatus(userId: string): Promise<MobileVerificationStatusResponseDto> {
    await this.userService.findById(userId);

    const verification = await this.findLatestMobileVerification(userId);

    if (!verification) {
      throw new NotFoundException('No mobile verification found. Please initiate verification first.');
    }

    return this.buildStatusResponse(verification);
  }

  // Retrieves the latest verification record for SSE connection setup
  async findLatestVerification(userId: string): Promise<Verification | undefined> {
    return this.findLatestMobileVerification(userId);
  }

  // Finds the most recent verification across all mobile channels
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

  // Builds the status response DTO from a verification record
  private buildStatusResponse(verification: Verification): MobileVerificationStatusResponseDto {
    return {
      success: true,
      message: verification.isVerified ? 'Phone number verified successfully' : 'Verification initiated successfully',
      verificationCode: undefined,
      whatsappNumber:
        verification.channel === VerificationChannelValues.WHATSAPP_IN && this.whatsappBusinessNumber
          ? this.whatsappBusinessNumber
          : undefined,
    };
  }

  // Sends verification message via the appropriate provider
  private async sendVerificationMessage(
    channel: VerificationChannel,
    phone: string,
    phoneCountry: string,
    secret: string,
  ): Promise<void> {
    const provider = this.verificationProviderFactory.getProvider(channel);

    provider.sendVerification(phone, phoneCountry, secret).catch((error: Error) => {
      this.logger.error(`Failed to send verification message: ${error.message}`);
    });
  }
}
