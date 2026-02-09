import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import {
  ApiInitiateTotpSetup,
  ApiVerifyTotpSetup,
  ApiSkip2FASetup,
  ApiGet2FAStatus,
  ApiInitiatePasskeySetup,
  ApiVerifyPasskeySetup,
} from '../docs/two-factor.docs';
import type { BackupCodesResponseDto } from '../dto/backup-codes-response.dto';
import type { PasskeyRegistrationOptionsDto } from '../dto/passkey-registration-options.dto';
import type { TotpSetupResponseDto } from '../dto/totp-setup-response.dto';
import type { TwoFactorStatusResponseDto } from '../dto/two-factor-status-response.dto';
import { VerifyPasskeyDto } from '../dto/verify-passkey.dto';
import { VerifyTotpDto } from '../dto/verify-totp.dto';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';

@ApiTags('Onboarding - Two-Factor Authentication')
@ApiBearerAuth()
@Controller('onboarding/2fa')
export class TwoFactorController {
  private readonly logger = new Logger(TwoFactorController.name);

  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  // Generates a TOTP secret and returns the QR code for authenticator app setup
  @Post('totp/setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiateTotpSetup()
  async initiateTotpSetup(@UserId() userId: string): Promise<TotpSetupResponseDto> {
    this.logger.log(`POST /onboarding/2fa/totp/setup - User: ${userId}`);
    return await this.twoFactorAuthService.initiateTotpSetup(userId);
  }

  // Validates the TOTP token and completes 2FA setup with backup codes
  @Post('totp/verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyTotpSetup()
  async verifyTotpSetup(
    @UserId() userId: string,
    @Body() verifyTotpDto: VerifyTotpDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/2fa/totp/verify - User: ${userId}`);
    return await this.twoFactorAuthService.verifyTotpSetup(userId, verifyTotpDto.token);
  }

  // Skips 2FA setup and completes onboarding without enabling two-factor auth
  @Post('skip')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiSkip2FASetup()
  async skip2FASetup(@UserId() userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/2fa/skip - User: ${userId}`);
    await this.twoFactorAuthService.skip2FASetup(userId);
    return {
      success: true,
      message: 'Two-factor authentication setup skipped. You can enable it later in settings.',
    };
  }

  // Retrieves the user's current 2FA configuration and backup code count
  @Get('status')
  @Onboarding()
  @ApiGet2FAStatus()
  async get2FAStatus(@UserId() userId: string): Promise<TwoFactorStatusResponseDto> {
    this.logger.log(`GET /onboarding/2fa/status - User: ${userId}`);
    return await this.twoFactorAuthService.get2FAStatus(userId);
  }

  // Generates WebAuthn registration options for passkey setup
  @Post('passkey/setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiatePasskeySetup()
  async initiatePasskeySetup(@UserId() userId: string): Promise<PasskeyRegistrationOptionsDto> {
    this.logger.log(`POST /onboarding/2fa/passkey/setup - User: ${userId}`);
    return await this.twoFactorAuthService.initiatePasskeySetup(userId);
  }

  // Verifies the passkey credential and completes 2FA setup with backup codes
  @Post('passkey/verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPasskeySetup()
  async verifyPasskeySetup(
    @UserId() userId: string,
    @Body() verifyPasskeyDto: VerifyPasskeyDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/2fa/passkey/verify - User: ${userId}`);
    return await this.twoFactorAuthService.verifyPasskeySetup(userId, verifyPasskeyDto.credential);
  }
}
