import { Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type SessionInfo, Onboarding, SessionData, UserId } from '@vritti/api-sdk';
import { ApiGetMfaStatus, ApiSkipMfaSetup } from '../docs/mfa-status.docs';
import type { MfaStatusResponseDto } from '../../totp/dto/response/mfa-status-response.dto';
import { MfaStatusService } from '../services/mfa-status.service';

@ApiTags('Onboarding - MFA')
@ApiBearerAuth()
@Controller('onboarding/mfa')
export class MfaStatusController {
  private readonly logger = new Logger(MfaStatusController.name);

  constructor(private readonly mfaStatusService: MfaStatusService) {}

  // Skips MFA setup and completes onboarding without enabling multi-factor auth
  @Post('skip')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiSkipMfaSetup()
  async skipMfaSetup(@SessionData() session: SessionInfo): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/mfa/skip - User: ${session.userId}`);
    return this.mfaStatusService.skipMfaSetup(session.userId, session.sessionId);
  }

  // Retrieves the user's current MFA configuration and backup code count
  @Get('status')
  @Onboarding()
  @ApiGetMfaStatus()
  async getMfaStatus(@UserId() userId: string): Promise<MfaStatusResponseDto> {
    this.logger.log(`GET /onboarding/mfa/status - User: ${userId}`);
    return this.mfaStatusService.getMfaStatus(userId);
  }
}
