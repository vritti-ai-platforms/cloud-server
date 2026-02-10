import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessToken, Public, RefreshTokenCookie, UserId } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import {
  ApiChangePassword,
  ApiForgotPassword,
  ApiGetAccessToken,
  ApiGetAuthStatus,
  ApiGetSessions,
  ApiLogin,
  ApiLogout,
  ApiLogoutAll,
  ApiRefreshTokens,
  ApiResetPassword,
  ApiRevokeSession,
  ApiSignup,
  ApiVerifyResetOtp,
} from '../docs/auth.docs';
import type { SessionResponse } from '../dto/entity/session-response.dto';
import { ChangePasswordDto } from '../dto/request/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from '../dto/request/forgot-password.dto';
import { LoginDto } from '../dto/request/login.dto';
import { SignupDto } from '../dto/request/signup.dto';
import type { AuthStatusResponse } from '../dto/response/auth-status-response.dto';
import type { LoginResponse } from '../dto/response/login-response.dto';
import type { SignupResponseDto } from '../dto/response/signup-response.dto';
import type { MessageResponse } from '../dto/response/message-response.dto';
import type { ResetTokenResponse } from '../dto/response/reset-token-response.dto';
import type { SuccessResponse } from '../dto/response/success-response.dto';
import type { TokenResponse } from '../dto/response/token-response.dto';
import { AuthService } from '../services/auth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../services/session.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // Creates a new user account and initiates onboarding
  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiSignup()
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<SignupResponseDto> {
    this.logger.log(`POST /auth/signup - Email: ${signupDto.email}`);

    const { refreshToken, ...response } = await this.authService.signup(signupDto, ipAddress, userAgent);

    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    return response;
  }

  // Authenticates user credentials, returns access token or MFA challenge
  @Post('login')
  @Public()
  @ApiLogin()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<LoginResponse> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    const { refreshToken, ...response } = await this.authService.login(loginDto, ipAddress, userAgent);

    if (refreshToken) {
      reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());
    }

    return response;
  }

  // Returns auth status without throwing 401
  @Get('status')
  @Public()
  @ApiGetAuthStatus()
  async getAuthStatus(@RefreshTokenCookie() refreshToken: string | undefined): Promise<AuthStatusResponse> {
    this.logger.log('GET /auth/status - Checking authentication status');
    return this.authService.getAuthStatus(refreshToken);
  }

  // Recovers session from httpOnly cookie without rotating the refresh token
  @Get('access-token')
  @Public()
  @ApiGetAccessToken()
  async getAccessToken(@RefreshTokenCookie() refreshToken: string | undefined): Promise<TokenResponse> {
    this.logger.log('GET /auth/access-token - Recovering session from cookie');
    return this.authService.getAccessToken(refreshToken);
  }

  // Rotates refresh token and issues a new access token
  @Post('refresh-tokens')
  @Public()
  @ApiRefreshTokens()
  async refreshTokens(
    @RefreshTokenCookie() refreshToken: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<TokenResponse> {
    this.logger.log('POST /auth/refresh-tokens');

    const result = await this.authService.refreshTokens(refreshToken);

    reply.setCookie(getRefreshCookieName(), result.refreshToken, getRefreshCookieOptionsFromConfig());

    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // Invalidates the current session and clears the refresh cookie
  @Post('logout')
  @ApiLogout()
  async logout(
    @AccessToken() accessToken: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MessageResponse> {
    await this.authService.logout(accessToken);
    reply.clearCookie(getRefreshCookieName(), { path: '/' });
    return { message: 'Successfully logged out' };
  }

  // Invalidates all sessions across all devices for the current user
  @Post('logout-all')
  @ApiLogoutAll()
  async logoutAll(@UserId() userId: string, @Res({ passthrough: true }) reply: FastifyReply): Promise<MessageResponse> {
    const count = await this.authService.logoutAll(userId);
    reply.clearCookie(getRefreshCookieName(), { path: '/' });
    return { message: `Successfully logged out from ${count} device(s)` };
  }

  // Returns all active sessions for the authenticated user
  @Get('sessions')
  @ApiGetSessions()
  async getSessions(@UserId() userId: string, @AccessToken() accessToken: string): Promise<SessionResponse[]> {
    this.logger.log(`GET /auth/sessions - User: ${userId}`);
    return this.authService.getUserSessions(userId, accessToken);
  }

  // Revokes a specific session by ID
  @Delete('sessions/:id')
  @ApiRevokeSession()
  async revokeSession(
    @UserId() userId: string,
    @Param('id') sessionId: string,
    @AccessToken() accessToken: string,
  ): Promise<MessageResponse> {
    this.logger.log(`DELETE /auth/sessions/${sessionId} - User: ${userId}`);
    return this.authService.revokeSession(userId, sessionId, accessToken);
  }

  // Verifies current password and updates to a new one
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiChangePassword()
  async changePassword(@UserId() userId: string, @Body() dto: ChangePasswordDto): Promise<MessageResponse> {
    this.logger.log(`POST /auth/password/change - User: ${userId}`);
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  // Sends password reset OTP to the given email
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiForgotPassword()
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<SuccessResponse> {
    this.logger.log(`POST /auth/forgot-password - Email: ${dto.email}`);
    return this.authService.requestPasswordReset(dto.email);
  }

  // Validates the reset OTP and returns a one-time reset token
  @Post('verify-reset-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyResetOtp()
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto): Promise<ResetTokenResponse> {
    this.logger.log(`POST /auth/verify-reset-otp - Email: ${dto.email}`);
    return this.authService.verifyResetOtp(dto.email, dto.otp);
  }

  // Sets a new password using the verified reset token
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResetPassword()
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<SuccessResponse> {
    this.logger.log('POST /auth/reset-password');
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }
}
