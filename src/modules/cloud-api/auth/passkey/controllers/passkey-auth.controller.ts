import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiStartPasskeyAuth, ApiVerifyPasskeyAuth } from '../docs/passkey-auth.docs';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/request/verify-passkey-auth.dto';
import { PasskeyAuthOptionsDto } from '../dto/response/passkey-auth-options.dto';
import { PasskeyAuthResponseDto } from '../dto/response/passkey-auth-response.dto';
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
  async startPasskeyAuth(@Body() dto: StartPasskeyAuthDto): Promise<PasskeyAuthOptionsDto> {
    this.logger.log(`POST /auth/passkey/start - Email: ${dto.email || 'none'}`);
    return this.passkeyAuthService.startAuthentication(dto.email);
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
  ): Promise<PasskeyAuthResponseDto> {
    this.logger.log('POST /auth/passkey/verify');

    const result = await this.passkeyAuthService.verifyAuthentication(
      dto.sessionId,
      dto.credential,
      req.ip,
      req.headers['user-agent'],
    );

    // Set refresh token cookie (domain from REFRESH_COOKIE_DOMAIN env var)
    res.setCookie(getRefreshCookieName(), result.refreshToken, getRefreshCookieOptionsFromConfig());

    return result;
  }
}
