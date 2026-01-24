import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Onboarding, UserId } from '@vritti/api-sdk';
import type { BackupCodesResponseDto } from '../dto/backup-codes-response.dto';
import type { PasskeyRegistrationOptionsDto } from '../dto/passkey-registration-options.dto';
import type { TotpSetupResponseDto } from '../dto/totp-setup-response.dto';
import type { TwoFactorStatusResponseDto } from '../dto/two-factor-status-response.dto';
import { VerifyPasskeyDto } from '../dto/verify-passkey.dto';
import { VerifyTotpDto } from '../dto/verify-totp.dto';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';

/**
 * Two-Factor Authentication Controller
 * Handles 2FA setup during onboarding flow
 */
@Controller('onboarding/2fa')
export class TwoFactorController {
  private readonly logger = new Logger(TwoFactorController.name);

  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  /**
   * Initiate TOTP setup - generates QR code and manual key
   * POST /onboarding/2fa/totp/setup
   */
  @Post('totp/setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async initiateTotpSetup(@UserId() userId: string): Promise<TotpSetupResponseDto> {
    this.logger.log(`POST /onboarding/2fa/totp/setup - User: ${userId}`);
    return await this.twoFactorAuthService.initiateTotpSetup(userId);
  }

  /**
   * Verify TOTP setup - validates code and returns backup codes
   * POST /onboarding/2fa/totp/verify
   */
  @Post('totp/verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async verifyTotpSetup(
    @UserId() userId: string,
    @Body() verifyTotpDto: VerifyTotpDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/2fa/totp/verify - User: ${userId}`);
    return await this.twoFactorAuthService.verifyTotpSetup(userId, verifyTotpDto.token);
  }

  /**
   * Skip 2FA setup - completes onboarding without 2FA
   * 
   * POST /onboarding/2fa/skip
   */
  @Post('skip')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async skip2FASetup(@UserId() userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/2fa/skip - User: ${userId}`);
    await this.twoFactorAuthService.skip2FASetup(userId);
    return {
      success: true,
      message: 'Two-factor authentication setup skipped. You can enable it later in settings.',
    };
  }

  /**
   * Get current 2FA status
   * GET /onboarding/2fa/status
   */
  @Get('status')
  @Onboarding()
  async get2FAStatus(@UserId() userId: string): Promise<TwoFactorStatusResponseDto> {
    this.logger.log(`GET /onboarding/2fa/status - User: ${userId}`);
    return await this.twoFactorAuthService.get2FAStatus(userId);
  }

  /**
   * Initiate Passkey setup - generates registration options
   * POST /onboarding/2fa/passkey/setup
   */
  @Post('passkey/setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async initiatePasskeySetup(@UserId() userId: string): Promise<PasskeyRegistrationOptionsDto> {
    this.logger.log(`POST /onboarding/2fa/passkey/setup - User: ${userId}`);
    return await this.twoFactorAuthService.initiatePasskeySetup(userId);
  }

  /**
   * Verify Passkey setup - validates credential and returns backup codes
   * POST /onboarding/2fa/passkey/verify
   */
  @Post('passkey/verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async verifyPasskeySetup(
    @UserId() userId: string,
    @Body() verifyPasskeyDto: VerifyPasskeyDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/2fa/passkey/verify - User: ${userId}`);
    return await this.twoFactorAuthService.verifyPasskeySetup(userId, verifyPasskeyDto.credential);
  }
}
