import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/verify-passkey-auth.dto';
import { PasskeyAuthService } from '../services/passkey-auth.service';

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
  @ApiOperation({
    summary: 'Start passkey authentication',
    description: 'Initiates the WebAuthn authentication flow by generating a challenge and authentication options. Optionally accepts an email to limit to the user\'s registered passkeys.',
  })
  @ApiBody({ type: StartPasskeyAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication options generated successfully.',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID for the authentication flow', example: 'sess_abc123def456' },
        options: {
          type: 'object',
          description: 'WebAuthn PublicKeyCredentialRequestOptions',
          properties: {
            challenge: { type: 'string', description: 'Base64URL encoded challenge' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', example: 60000 },
            rpId: { type: 'string', description: 'Relying party ID', example: 'example.com' },
            allowCredentials: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Credential ID' },
                  type: { type: 'string', example: 'public-key' },
                  transports: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            userVerification: { type: 'string', example: 'preferred' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or no passkeys registered for the provided email.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found for the provided email.',
  })
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
  @ApiOperation({
    summary: 'Verify passkey authentication',
    description: 'Verifies the WebAuthn authentication response and creates a user session. Returns an access token and sets a refresh token in an httpOnly cookie.',
  })
  @ApiBody({ type: VerifyPasskeyAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful. Returns access token and user information.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        expiresIn: { type: 'number', description: 'Token expiry in seconds', example: 900 },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID', example: 'usr_123456789' },
            email: { type: 'string', description: 'User email', example: 'user@example.com' },
            firstName: { type: 'string', description: 'User first name', example: 'John' },
            lastName: { type: 'string', description: 'User last name', example: 'Doe' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credential or session ID.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication failed. Invalid or expired challenge.',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or passkey not registered.',
  })
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
