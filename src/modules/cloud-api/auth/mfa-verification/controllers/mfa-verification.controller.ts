import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../../root/services/session.service';
import {
  ApiSendSmsOtp,
  ApiStartPasskeyMfa,
  ApiVerifyPasskeyMfa,
  ApiVerifySmsOtp,
  ApiVerifyTotp,
} from '../docs/mfa-verification.docs';
import {
  MfaVerificationResponseDto,
  PasskeyMfaOptionsDto,
  SendSmsOtpDto,
  SmsOtpSentResponseDto,
  StartPasskeyMfaDto,
  VerifyMfaTotpDto,
  VerifyPasskeyMfaDto,
  VerifySmsOtpDto,
} from '../dto';
import { MfaVerificationService } from '../services/mfa-verification.service';

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaVerificationController {
  private readonly logger = new Logger(MfaVerificationController.name);

  constructor(private readonly mfaVerificationService: MfaVerificationService) {}

  // Verifies a TOTP code from an authenticator app to complete MFA login
  @Post('verify-totp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyTotp()
  async verifyTotp(
    @Body() dto: VerifyMfaTotpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/verify-totp - sessionId: ${dto.sessionId}`);
    const { refreshToken, ...response } = await this.mfaVerificationService.verifyTotp(dto.sessionId, dto.code);

    // Set refresh token in httpOnly cookie
    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    return response;
  }

  // Sends an SMS OTP to the user's verified phone number for MFA
  @Post('sms/send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiSendSmsOtp()
  async sendSmsOtp(@Body() dto: SendSmsOtpDto): Promise<SmsOtpSentResponseDto> {
    this.logger.log(`POST /auth/mfa/sms/send - sessionId: ${dto.sessionId}`);
    return this.mfaVerificationService.sendSmsOtp(dto.sessionId);
  }

  // Verifies the SMS OTP code to complete MFA login
  @Post('sms/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifySmsOtp()
  async verifySmsOtp(
    @Body() dto: VerifySmsOtpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/sms/verify - sessionId: ${dto.sessionId}`);
    const { refreshToken, ...response } = await this.mfaVerificationService.verifySmsOtp(dto.sessionId, dto.code);

    // Set refresh token in httpOnly cookie
    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    return response;
  }

  // Generates WebAuthn authentication options to begin passkey MFA verification
  @Post('passkey/start')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiStartPasskeyMfa()
  async startPasskeyMfa(@Body() dto: StartPasskeyMfaDto): Promise<PasskeyMfaOptionsDto> {
    this.logger.log(`POST /auth/mfa/passkey/start - sessionId: ${dto.sessionId}`);
    return this.mfaVerificationService.startPasskeyMfa(dto.sessionId);
  }

  // Verifies the passkey authentication response to complete MFA login
  @Post('passkey/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPasskeyMfa()
  async verifyPasskeyMfa(
    @Body() dto: VerifyPasskeyMfaDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/passkey/verify - sessionId: ${dto.sessionId}`);
    const { refreshToken, ...response } = await this.mfaVerificationService.verifyPasskeyMfa(
      dto.sessionId,
      dto.credential,
    );

    // Set refresh token in httpOnly cookie
    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    return response;
  }
}
