import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import {
  ApiGetMobileVerificationStatus,
  ApiInitiateMobileVerification,
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

  constructor(
    private readonly mobileVerificationService: MobileVerificationService,
  ) {}

  // Starts mobile verification using the chosen method (WhatsApp, SMS, or OTP)
  @Post('initiate')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiateMobileVerification()
  async initiateMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/initiate - User: ${userId}`);

    return this.mobileVerificationService.initiateVerification(userId, dto);
  }

  // Returns the current mobile verification state for the user
  @Get('status')
  @Onboarding()
  @ApiGetMobileVerificationStatus()
  async getMobileVerificationStatus(@UserId() userId: string): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`GET /onboarding/mobile-verification/status - User: ${userId}`);

    return this.mobileVerificationService.getVerificationStatus(userId);
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
