import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SessionResponse } from '../dto/entity/session-response.dto';
import { ChangePasswordDto } from '../dto/request/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from '../dto/request/forgot-password.dto';
import { LoginDto } from '../dto/request/login.dto';
import { SignupDto } from '../dto/request/signup.dto';
import { AuthStatusResponse } from '../dto/response/auth-status-response.dto';
import { LoginResponse } from '../dto/response/login-response.dto';
import { MessageResponse } from '../dto/response/message-response.dto';
import { ResetTokenResponse } from '../dto/response/reset-token-response.dto';
import { SuccessResponse } from '../dto/response/success-response.dto';
import { TokenResponse } from '../dto/response/token-response.dto';

export function ApiSignup() {
  return applyDecorators(
    ApiOperation({
      summary: 'User signup',
      description:
        'Creates a new user account and initiates the onboarding flow. Returns an access token and sets a refresh token in an httpOnly cookie.',
    }),
    ApiBody({ type: SignupDto }),
    ApiResponse({ status: 200, description: 'User created successfully.', type: TokenResponse }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation error.' }),
    ApiResponse({ status: 409, description: 'User with this email already exists.' }),
  );
}

export function ApiGetToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Recover session token',
      description:
        'Recovers the session by reading the refresh token from the httpOnly cookie and returns a new access token. Does not rotate the refresh token.',
    }),
    ApiResponse({ status: 200, description: 'Session recovered successfully.', type: TokenResponse }),
    ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' }),
  );
}

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'User login',
      description:
        'Authenticates the user with email and password. Returns an access token and sets a refresh token in an httpOnly cookie.',
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({ status: 201, description: 'Login successful.', type: LoginResponse }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation error.' }),
    ApiResponse({ status: 401, description: 'Invalid credentials.' }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Generates a new access token and rotates the refresh token for enhanced security.',
    }),
    ApiResponse({ status: 201, description: 'Token refreshed successfully.', type: TokenResponse }),
    ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' }),
  );
}

export function ApiLogout() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Logout from current device',
      description: 'Invalidates the current session and clears the refresh token cookie.',
    }),
    ApiResponse({ status: 201, description: 'Successfully logged out.', type: MessageResponse }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiLogoutAll() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Logout from all devices',
      description: 'Invalidates all active sessions for the current user across all devices.',
    }),
    ApiResponse({ status: 201, description: 'Successfully logged out from all devices.', type: MessageResponse }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiGetCurrentUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current user authentication status',
      description:
        'Checks authentication status via httpOnly cookie. Returns user data and access token if authenticated, or { isAuthenticated: false } if not. Never returns 401.',
    }),
    ApiResponse({ status: 200, description: 'Authentication status returned.', type: AuthStatusResponse }),
  );
}

export function ApiForgotPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request password reset',
      description: 'Sends a password reset OTP to the provided email. Always returns success to prevent email enumeration.',
    }),
    ApiBody({ type: ForgotPasswordDto }),
    ApiResponse({ status: 200, description: 'Password reset email sent (if account exists).', type: SuccessResponse }),
    ApiResponse({ status: 400, description: 'Invalid input data.' }),
  );
}

export function ApiVerifyResetOtp() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify password reset OTP',
      description: 'Validates the OTP sent to the user email and returns a reset token.',
    }),
    ApiBody({ type: VerifyResetOtpDto }),
    ApiResponse({ status: 200, description: 'OTP verified successfully.', type: ResetTokenResponse }),
    ApiResponse({ status: 400, description: 'No reset request found or OTP expired.' }),
    ApiResponse({ status: 401, description: 'Invalid OTP.' }),
  );
}

export function ApiResetPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reset password',
      description: 'Sets a new password using the reset token. Invalidates all active sessions.',
    }),
    ApiBody({ type: ResetPasswordDto }),
    ApiResponse({ status: 200, description: 'Password reset successfully.', type: SuccessResponse }),
    ApiResponse({ status: 400, description: 'Invalid or expired reset token.' }),
  );
}

export function ApiChangePassword() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Change password',
      description: "Change the authenticated user's password. Requires current password verification.",
    }),
    ApiBody({ type: ChangePasswordDto }),
    ApiResponse({ status: 200, description: 'Password changed successfully.', type: MessageResponse }),
    ApiResponse({ status: 400, description: 'Invalid current password or validation error.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiGetSessions() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List active sessions',
      description: 'Get all active sessions for the authenticated user across all devices.',
    }),
    ApiResponse({ status: 200, description: 'Active sessions retrieved.', type: [SessionResponse] }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiRevokeSession() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Revoke a specific session',
      description: 'Invalidate a specific session by ID. Cannot revoke the current session.',
    }),
    ApiParam({ name: 'id', description: 'Session ID to revoke' }),
    ApiResponse({ status: 200, description: 'Session revoked.', type: MessageResponse }),
    ApiResponse({ status: 400, description: 'Cannot revoke current session.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Session not found.' }),
  );
}
