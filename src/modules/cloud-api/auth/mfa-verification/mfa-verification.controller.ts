import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiVerifyTotp, ApiSendSmsOtp, ApiVerifySmsOtp, ApiStartPasskeyMfa, ApiVerifyPasskeyMfa } from './mfa-verification.docs';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../services/session.service';
import {
  MfaVerificationResponseDto,
  PasskeyMfaOptionsDto,
  SendSmsOtpDto,
  SmsOtpSentResponseDto,
  StartPasskeyMfaDto,
  VerifyMfaTotpDto,
  VerifyPasskeyMfaDto,
  VerifySmsOtpDto,
} from './dto';
import { MfaVerificationService } from './mfa-verification.service';

/**
 * MFA Verification Controller
 * Handles multi-factor authentication verification during login
 *
 * All endpoints are public (no auth required) because user is mid-login flow.
 * The MFA session ID serves as the security context.
 */
@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaVerificationController {
  private readonly logger = new Logger(MfaVerificationController.name);

  constructor(private readonly mfaVerificationService: MfaVerificationService) {}

  /**
   * Verify TOTP code
   * POST /auth/mfa/verify-totp
   *
   * Validates a 6-digit TOTP code from an authenticator app.
   * Also accepts backup codes as fallback.
   */
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

  /**
   * Send SMS OTP
   * POST /auth/mfa/sms/send
   *
   * Sends a 6-digit OTP to the user's verified phone number.
   */
  @Post('sms/send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiSendSmsOtp()
  async sendSmsOtp(@Body() dto: SendSmsOtpDto): Promise<SmsOtpSentResponseDto> {
    this.logger.log(`POST /auth/mfa/sms/send - sessionId: ${dto.sessionId}`);
    return await this.mfaVerificationService.sendSmsOtp(dto.sessionId);
  }

  /**
   * Verify SMS OTP code
   * POST /auth/mfa/sms/verify
   *
   * Validates the 6-digit OTP sent via SMS.
   */
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

  /**
   * Start passkey authentication for MFA
   * POST /auth/mfa/passkey/start
   *
   * Generates WebAuthn authentication options for the user's registered passkeys.
   */
  @Post('passkey/start')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiStartPasskeyMfa()
  async startPasskeyMfa(@Body() dto: StartPasskeyMfaDto): Promise<PasskeyMfaOptionsDto> {
    this.logger.log(`POST /auth/mfa/passkey/start - sessionId: ${dto.sessionId}`);
    return await this.mfaVerificationService.startPasskeyMfa(dto.sessionId);
  }

  /**
   * Verify passkey authentication for MFA
   * POST /auth/mfa/passkey/verify
   *
   * Validates the WebAuthn authentication response.
   */
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
      dto.credential as any,
    );

    // Set refresh token in httpOnly cookie
    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    return response;
  }
}
