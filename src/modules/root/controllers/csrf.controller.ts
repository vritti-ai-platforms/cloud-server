import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { ApiGetCsrfToken } from '../docs/csrf.docs';

@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  // Generates a CSRF token via Fastify's csrf-protection plugin
  @Get('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiGetCsrfToken()
  getToken(@Res({ passthrough: true }) reply: FastifyReply): { csrfToken: string } {
    const csrfToken = reply.generateCsrf();
    return { csrfToken };
  }
}
