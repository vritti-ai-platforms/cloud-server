import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Public } from '@vritti/api-sdk';
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
  async verifyTotp(@Body() dto: VerifyMfaTotpDto): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/verify-totp - sessionId: ${dto.sessionId}`);
    return await this.mfaVerificationService.verifyTotp(dto.sessionId, dto.code);
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
  async verifySmsOtp(@Body() dto: VerifySmsOtpDto): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/sms/verify - sessionId: ${dto.sessionId}`);
    return await this.mfaVerificationService.verifySmsOtp(dto.sessionId, dto.code);
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
  async verifyPasskeyMfa(@Body() dto: VerifyPasskeyMfaDto): Promise<MfaVerificationResponseDto> {
    this.logger.log(`POST /auth/mfa/passkey/verify - sessionId: ${dto.sessionId}`);
    return await this.mfaVerificationService.verifyPasskeyMfa(dto.sessionId, dto.credential as any);
  }
}
