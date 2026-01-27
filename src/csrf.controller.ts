import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';

/**
 * CSRF Token Controller
 *
 * Provides endpoints for CSRF token management
 */
@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  /**
   * Get CSRF token
   * GET /csrf/token
   *
   * This endpoint generates and returns a CSRF token that must be included
   * in all state-changing requests (POST, PUT, PATCH, DELETE).
   *
   * The token should be sent in the X-CSRF-Token header.
   *
   * @returns { csrfToken: string }
   *
   * @example
   * // Frontend usage:
   * const response = await fetch('/csrf/token');
   * const { csrfToken } = await response.json();
   *
   * // Use token in subsequent requests:
   * await fetch('/onboarding/register', {
   *   method: 'POST',
   *   headers: {
   *     'Content-Type': 'application/json',
   *     'X-CSRF-Token': csrfToken,
   *   },
   *   body: JSON.stringify(data),
   * });
   */
  @Get('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get CSRF token',
    description:
      'Generates and returns a CSRF token that must be included in all state-changing requests (POST, PUT, PATCH, DELETE). The token should be sent in the X-CSRF-Token header.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    schema: {
      type: 'object',
      properties: {
        csrfToken: {
          type: 'string',
          description: 'The CSRF token to use in subsequent requests',
          example: 'abc123xyz789',
        },
      },
      required: ['csrfToken'],
    },
  })
  getToken(@Res({ passthrough: true }) reply: FastifyReply): { csrfToken: string } {
    // Generate CSRF token using Fastify's csrf-protection plugin
    // The plugin automatically:
    // 1. Creates a secret and stores it in a signed, httpOnly cookie (_csrf)
    // 2. Generates a token using HMAC(secret, timestamp)
    // 3. Returns the token for use in subsequent requests
    const csrfToken = reply.generateCsrf();

    return { csrfToken };
  }
}
