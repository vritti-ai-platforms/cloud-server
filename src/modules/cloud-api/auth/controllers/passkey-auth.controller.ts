import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/verify-passkey-auth.dto';
import { PasskeyAuthService } from '../services/passkey-auth.service';

/**
 * Passkey Authentication Controller
 * Handles passwordless login using WebAuthn/Passkeys
 */
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
      dto.credential as any,
      ipAddress,
      userAgent,
    );

    // Set refresh token cookie (same as regular login)
    res.setCookie('vritti_refresh', result.session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return {
      accessToken: result.session.accessToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    };
  }
}
