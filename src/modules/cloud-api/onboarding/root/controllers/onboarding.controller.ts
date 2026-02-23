import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, RefreshTokenCookie, SessionData, type SessionInfo, UserId } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { TokenResponse } from '../../../auth/root/dto/response/token-response.dto';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../../../auth/root/services/session.service';
import { ApiCompleteOnboarding, ApiGetStatus, ApiSetPassword } from '../docs/onboarding.docs';
import { OnboardingStatusResponseDto } from '../dto/entity/onboarding-status-response.dto';
import { SetPasswordDto } from '../dto/request/set-password.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';
import { OnboardingService } from '../services/onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  // Retrieves the user's current onboarding step and completion status
  @Get('status')
  @Onboarding()
  @ApiGetStatus()
  async getStatus(@UserId() userId: string): Promise<OnboardingStatusResponseDto> {
    this.logger.log(`GET /onboarding/status - User: ${userId}`);
    return this.onboardingService.getStatus(userId);
  }

  // Hashes and stores the user's password during onboarding
  @Post('set-password')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiSetPassword()
  async setPassword(
    @UserId() userId: string,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<StartOnboardingResponseDto> {
    const password: string = setPasswordDto.password;
    this.logger.log(`POST /onboarding/set-password - User: ${userId}`);
    return this.onboardingService.setPassword(userId, password);
  }

  // Upgrades session to CLOUD, rotates tokens, and exits onboarding
  @Post('complete')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiCompleteOnboarding()
  async completeOnboarding(
    @SessionData() session: SessionInfo,
    @RefreshTokenCookie() refreshToken: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<TokenResponse> {
    this.logger.log(`POST /onboarding/complete - User: ${session.userId}`);
    const result = await this.onboardingService.completeSession(session.sessionId, session.userId, refreshToken);
    reply.setCookie(getRefreshCookieName(), result.refreshToken, getRefreshCookieOptionsFromConfig());
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }
}
