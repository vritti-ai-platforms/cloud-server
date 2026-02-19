import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import { ApiInitiateTotpSetup, ApiVerifyTotpSetup } from '../docs/totp-setup.docs';
import { VerifyTotpDto } from '../dto/request/verify-totp.dto';
import type { BackupCodesResponseDto } from '../dto/response/backup-codes-response.dto';
import type { TotpSetupResponseDto } from '../dto/response/totp-setup-response.dto';
import { TotpSetupService } from '../services/totp-setup.service';

@ApiTags('Onboarding - TOTP')
@ApiBearerAuth()
@Controller('onboarding/mfa/totp')
export class TotpSetupController {
  private readonly logger = new Logger(TotpSetupController.name);

  constructor(private readonly totpSetupService: TotpSetupService) {}

  // Generates a TOTP secret and returns the QR code for authenticator app setup
  @Post('setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiateTotpSetup()
  async initiateTotpSetup(@UserId() userId: string): Promise<TotpSetupResponseDto> {
    this.logger.log(`POST /onboarding/mfa/totp/setup - User: ${userId}`);
    return this.totpSetupService.initiateSetup(userId);
  }

  // Validates the TOTP token and completes MFA setup with backup codes
  @Post('verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyTotpSetup()
  async verifyTotpSetup(
    @UserId() userId: string,
    @Body() dto: VerifyTotpDto,
  ): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/mfa/totp/verify - User: ${userId}`);
    return this.totpSetupService.verifySetup(userId, dto.token);
  }
}
