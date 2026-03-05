import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Logger, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type CookieSerializeOptions, Public, RefreshCookieOptions } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { getRefreshCookieName } from '../../root/services/session.service';
import { ApiStartPasskeyAuth, ApiVerifyPasskeyAuth } from '../docs/passkey-auth.docs';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/request/verify-passkey-auth.dto';
import { PasskeyAuthOptionsDto } from '../dto/response/passkey-auth-options.dto';
import { PasskeyAuthResponseDto } from '../dto/response/passkey-auth-response.dto';
import { PasskeyAuthService } from '../services/passkey-auth.service';

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
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @RefreshCookieOptions() cookieOptions: CookieSerializeOptions,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<PasskeyAuthResponseDto> {
    this.logger.log('POST /auth/passkey/verify');

    const result = await this.passkeyAuthService.verifyAuthentication(
      dto.sessionId,
      dto.credential,
      ipAddress,
      userAgent,
    );

    res.setCookie(getRefreshCookieName(), result.refreshToken, cookieOptions);

    return result;
  }
}
