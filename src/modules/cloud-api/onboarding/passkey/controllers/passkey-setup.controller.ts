import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type SessionInfo, Onboarding, SessionData, UserId } from '@vritti/api-sdk';
import type { BackupCodesResponseDto } from '../../totp/dto/response/backup-codes-response.dto';
import { ApiInitiatePasskeySetup, ApiVerifyPasskeySetup } from '../docs/passkey-setup.docs';
import { VerifyPasskeyDto } from '../dto/request/verify-passkey.dto';
import type { PasskeyRegistrationOptionsDto } from '../dto/response/passkey-registration-options.dto';
import { PasskeySetupService } from '../services/passkey-setup.service';

@ApiTags('Onboarding - Passkey')
@ApiBearerAuth()
@Controller('onboarding/mfa/passkey')
export class PasskeySetupController {
  private readonly logger = new Logger(PasskeySetupController.name);

  constructor(private readonly passkeySetupService: PasskeySetupService) {}

  // Generates WebAuthn registration options for passkey setup
  @Post('setup')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiatePasskeySetup()
  async initiatePasskeySetup(@UserId() userId: string): Promise<PasskeyRegistrationOptionsDto> {
    this.logger.log(`POST /onboarding/mfa/passkey/setup - User: ${userId}`);
    return this.passkeySetupService.initiateSetup(userId);
  }

  // Verifies the passkey credential and completes MFA setup with backup codes
  @Post('verify')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPasskeySetup()
  async verifyPasskeySetup(@SessionData() session: SessionInfo, @Body() dto: VerifyPasskeyDto): Promise<BackupCodesResponseDto> {
    this.logger.log(`POST /onboarding/mfa/passkey/verify - User: ${session.userId}`);
    return this.passkeySetupService.verifySetup(session.userId, dto.credential, session.sessionId);
  }
}
