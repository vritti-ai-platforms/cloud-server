import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Logger,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { FastifyRequest } from 'fastify';

/**
 * Auth Controller
 * Handles user authentication, token refresh, and logout
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * User login
   * POST /auth/login
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    return await this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Post('refresh')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    this.logger.log('Token refresh attempt');
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Logout from current device
   * POST /auth/logout
   * Requires: JWT access token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: FastifyRequest): Promise<{ message: string }> {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') || '';

    await this.authService.logout(accessToken);

    return {
      message: 'Successfully logged out',
    };
  }

  /**
   * Logout from all devices
   * POST /auth/logout-all
   * Requires: JWT access token
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() request: any): Promise<{ message: string }> {
    const userId = request.user.id; // Set by JwtAuthGuard

    const count = await this.authService.logoutAll(userId);

    return {
      message: `Successfully logged out from ${count} device(s)`,
    };
  }

  /**
   * Get current user info
   * GET /auth/me
   * Requires: JWT access token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() request: any) {
    return request.user; // User info set by JwtAuthGuard
  }
}
