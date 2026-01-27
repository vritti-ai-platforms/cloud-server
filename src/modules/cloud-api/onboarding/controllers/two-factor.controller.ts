import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiTags('Onboarding - Two-Factor Authentication')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Initiate TOTP (Time-based One-Time Password) setup' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code and manual key for TOTP setup',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  @ApiResponse({ status: 409, description: 'TOTP already configured for this user' })
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
  @ApiOperation({ summary: 'Verify TOTP setup with a code from authenticator app' })
  @ApiBody({ type: VerifyTotpDto, description: 'TOTP verification payload' })
  @ApiResponse({
    status: 200,
    description: 'TOTP verified successfully, returns backup codes',
  })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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
  @ApiOperation({ summary: 'Skip two-factor authentication setup' })
  @ApiResponse({
    status: 200,
    description: '2FA setup skipped successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Two-factor authentication setup skipped. You can enable it later in settings.' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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
  @ApiOperation({ summary: 'Get current two-factor authentication status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current 2FA configuration status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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
  @ApiOperation({ summary: 'Initiate Passkey/WebAuthn setup' })
  @ApiResponse({
    status: 200,
    description: 'Returns WebAuthn registration options for passkey setup',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  @ApiResponse({ status: 409, description: 'Passkey already configured for this user' })
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
  @ApiOperation({ summary: 'Verify Passkey/WebAuthn credential registration' })
  @ApiBody({ type: VerifyPasskeyDto, description: 'Passkey credential verification payload' })
  @ApiResponse({
    status: 200,
    description: 'Passkey registered successfully, returns backup codes',
  })
  @ApiResponse({ status: 400, description: 'Invalid passkey credential' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  async verifyPasskeySetup(
    @UserId() userId: string,
    @Body() verifyPasskeyDto: VerifyPasskeyDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/2fa/passkey/verify - User: ${userId}`);
    return await this.twoFactorAuthService.verifyPasskeySetup(userId, verifyPasskeyDto.credential);
  }
}
