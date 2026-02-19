import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiStartPasskeyAuth, ApiVerifyPasskeyAuth } from '../docs/passkey-auth.docs';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/request/verify-passkey-auth.dto';
import { PasskeyAuthService } from '../services/passkey-auth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../../root/services/session.service';

@ApiTags('Auth - Passkey')
@Controller('auth/passkey')
export class PasskeyAuthController {
  private readonly logger = new Logger(PasskeyAuthController.name);

  constructor(private readonly passkeyAuthService: PasskeyAuthService) {}

  // Generates WebAuthn authentication options to begin passwordless passkey login
  @Post('start')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiStartPasskeyAuth()
  async startPasskeyAuth(@Body() dto: StartPasskeyAuthDto) {
    this.logger.log(`POST /auth/passkey/start - Email: ${dto.email || 'none'}`);
    return await this.passkeyAuthService.startAuthentication(dto.email);
  }

  // Verifies the passkey credential and creates an authenticated session
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
        fullName: result.user.fullName,
        displayName: result.user.displayName,
      },
    };
  }
}
