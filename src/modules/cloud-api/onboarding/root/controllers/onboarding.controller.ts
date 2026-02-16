import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import { ApiGetStatus, ApiSetPassword, ApiStartOnboarding } from '../docs/onboarding.docs';
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

  // Begins the onboarding flow and triggers step-specific actions like sending OTPs
  @Post('start')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiStartOnboarding()
  async startOnboarding(@UserId() userId: string): Promise<StartOnboardingResponseDto> {
    this.logger.log(`POST /onboarding/start - User: ${userId}`);
    return this.onboardingService.startOnboarding(userId);
  }

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
  ): Promise<{ success: boolean; message: string }> {
    const password: string = setPasswordDto.password;
    this.logger.log(`POST /onboarding/set-password - User: ${userId}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.onboardingService.setPassword(userId, password);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }
}
