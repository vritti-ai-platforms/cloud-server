import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStartPasskeyAuth, ApiVerifyPasskeyAuth } from '../docs/passkey-auth.docs';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/verify-passkey-auth.dto';
import { PasskeyAuthService } from '../services/passkey-auth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../services/session.service';

/**
 * Passkey Authentication Controller
 * Handles passwordless login using WebAuthn/Passkeys
 */
@ApiTags('Auth - Passkey')
@Controller('auth/passkey')
export class PasskeyAuthController {
  private readonly logger = new Logger(PasskeyAuthController.name);

  constructor(private readonly passkeyAuthService: PasskeyAuthService) {}

  /**
   * Start passkey authentication
   * POST /auth/passkey/start
   *
   * @param dto - Optional email to limit to user's registered passkeys
   * @returns Authentication options with challenge and session ID
   */
  @Post('start')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiStartPasskeyAuth()
  async startPasskeyAuth(@Body() dto: StartPasskeyAuthDto) {
    this.logger.log(`POST /auth/passkey/start - Email: ${dto.email || 'none'}`);
    return await this.passkeyAuthService.startAuthentication(dto.email);
  }

  /**
   * Verify passkey authentication and create session
   * POST /auth/passkey/verify
   *
   * @param dto - Session ID and credential from WebAuthn API
   * @returns Access token and user info
   */
  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPasskeyAuth()
  async verifyPasskeyAuth(
    @Body() dto: VerifyPasskeyAuthDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    this.logger.log('POST /auth/passkey/verify');

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.passkeyAuthService.verifyAuthentication(
      dto.sessionId,
      dto.credential,
      ipAddress,
      userAgent,
    );

    // Set refresh token cookie (domain from REFRESH_COOKIE_DOMAIN env var)
    res.setCookie(getRefreshCookieName(), result.session.refreshToken, getRefreshCookieOptionsFromConfig());

    return {
      accessToken: result.session.accessToken,
      expiresIn: result.session.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    };
  }
}
