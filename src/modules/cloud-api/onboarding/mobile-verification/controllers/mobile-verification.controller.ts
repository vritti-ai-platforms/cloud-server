import { Body, Controller, HttpCode, HttpStatus, Logger, type MessageEvent, Post, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import { Observable } from 'rxjs';
import { VerificationChannelValues } from '@/db/schema/enums';
import {
  ApiInitiateManualMobileVerification,
  ApiSubscribeSms,
  ApiSubscribeWhatsApp,
  ApiVerifyMobileOtp,
} from '../docs/mobile-verification.docs';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { VerifyMobileOtpDto } from '../dto/request/verify-mobile-otp.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';
import { MobileVerificationService } from '../services/mobile-verification.service';

@ApiTags('Onboarding - Mobile Verification')
@ApiBearerAuth()
@Controller('onboarding/mobile-verification')
export class MobileVerificationController {
  private readonly logger = new Logger(MobileVerificationController.name);

  constructor(private readonly mobileVerificationService: MobileVerificationService) {}

  // Starts manual OTP verification via SMS (requires phone number in body)
  @Post('initiate/manual')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiateManualMobileVerification()
  async initiateMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/initiate/manual - User: ${userId}`);

    return this.mobileVerificationService.initiateVerification(userId, dto);
  }

  // Initiates WhatsApp verification and streams real-time status events
  @Sse('events/whatsapp')
  @Onboarding()
  @ApiSubscribeWhatsApp()
  async subscribeWhatsApp(@UserId() userId: string): Promise<Observable<MessageEvent>> {
    this.logger.log(`SSE /onboarding/mobile-verification/events/whatsapp - User: ${userId}`);

    return this.mobileVerificationService.initiateAndSubscribe(userId, VerificationChannelValues.WHATSAPP_IN);
  }

  // Initiates SMS QR verification and streams real-time status events
  @Sse('events/sms')
  @Onboarding()
  @ApiSubscribeSms()
  async subscribeSms(@UserId() userId: string): Promise<Observable<MessageEvent>> {
    this.logger.log(`SSE /onboarding/mobile-verification/events/sms - User: ${userId}`);

    return this.mobileVerificationService.initiateAndSubscribe(userId, VerificationChannelValues.SMS_IN);
  }

  // Validates the manually-entered OTP for mobile phone verification
  @Post('verify-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyMobileOtp()
  async verifyMobileOtp(
    @UserId() userId: string,
    @Body() dto: VerifyMobileOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/mobile-verification/verify-otp - User: ${userId}`);

    await this.mobileVerificationService.verifyOtp(userId, dto.otp);

    return {
      success: true,
      message: 'Phone number verified successfully',
    };
  }
}
