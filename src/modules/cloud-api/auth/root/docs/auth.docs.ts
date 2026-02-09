import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SignupDto } from '../dto/signup.dto';

export function ApiSignup() {
  return applyDecorators(
    ApiOperation({
      summary: 'User signup',
      description:
        'Creates a new user account and initiates the onboarding flow. Returns an access token and sets a refresh token in an httpOnly cookie.',
    }),
    ApiBody({ type: SignupDto }),
    ApiResponse({
      status: 200,
      description: 'User created successfully. Returns onboarding status and access token.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input data or validation error.',
    }),
    ApiResponse({
      status: 409,
      description: 'User with this email already exists.',
    }),
  );
}

export function ApiGetToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Recover session token',
      description:
        'Recovers the session by reading the refresh token from the httpOnly cookie and returns a new access token. Does not rotate the refresh token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Session recovered successfully. Returns new access token.',
      schema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT access token' },
          expiresIn: { type: 'number', description: 'Token expiry in seconds' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token.',
    }),
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
    ApiResponse({
      status: 201,
      description: 'Login successful. Returns access token and user information.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input data or validation error.',
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials.',
    }),
    ApiResponse({
      status: 404,
      description: 'User not found.',
    }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Generates a new access token and rotates the refresh token for enhanced security. Reads refresh token from httpOnly cookie and updates it with the new rotated token.',
    }),
    ApiResponse({
      status: 201,
      description: 'Token refreshed successfully. Returns new access token.',
      schema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'New JWT access token' },
          expiresIn: { type: 'number', description: 'Token expiry in seconds' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token.',
    }),
  );
}

export function ApiLogout() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Logout from current device',
      description:
        'Invalidates the current session and clears the refresh token cookie. Only logs out from the current device.',
    }),
    ApiResponse({
      status: 201,
      description: 'Successfully logged out.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Successfully logged out' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized. Invalid or missing access token.',
    }),
  );
}

export function ApiLogoutAll() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Logout from all devices',
      description:
        'Invalidates all active sessions for the current user across all devices and clears the refresh token cookie.',
    }),
    ApiResponse({
      status: 201,
      description: 'Successfully logged out from all devices.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Successfully logged out from 3 device(s)' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized. Invalid or missing access token.',
    }),
  );
}

export function ApiGetCurrentUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current user authentication status',
      description:
        'Checks authentication status via httpOnly cookie. Returns user data and access token if authenticated, or { isAuthenticated: false } if not. Never returns a 401 error.',
    }),
    ApiResponse({
      status: 200,
      description: 'Authentication status returned.',
      type: AuthStatusResponseDto,
    }),
  );
}

export function ApiForgotPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request password reset',
      description:
        'Sends a password reset OTP to the provided email address. Always returns success to prevent email enumeration.',
    }),
    ApiBody({ type: ForgotPasswordDto }),
    ApiResponse({
      status: 200,
      description: 'Password reset email sent (if account exists).',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'If an account with that email exists, a password reset code has been sent.',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input data.',
    }),
  );
}

export function ApiVerifyResetOtp() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify password reset OTP',
      description: 'Validates the OTP sent to the user email and returns a reset token for setting a new password.',
    }),
    ApiBody({ type: VerifyResetOtpDto }),
    ApiResponse({
      status: 200,
      description: 'OTP verified successfully. Returns reset token.',
      schema: {
        type: 'object',
        properties: {
          resetToken: { type: 'string', description: 'Token to use for resetting the password' },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'No reset request found or OTP expired.',
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid OTP.',
    }),
  );
}

export function ApiResetPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reset password',
      description:
        'Sets a new password using the reset token received after OTP verification. Invalidates all active sessions.',
    }),
    ApiBody({ type: ResetPasswordDto }),
    ApiResponse({
      status: 200,
      description: 'Password reset successfully.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'Password has been reset successfully. Please login with your new password.',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or expired reset token.',
    }),
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
    ApiResponse({
      status: 200,
      description: 'Password changed successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Password changed successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid current password or validation error' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
  );
}

export function ApiGetSessions() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List active sessions',
      description: 'Get all active sessions for the authenticated user across all devices.',
    }),
    ApiResponse({
      status: 200,
      description: 'Active sessions retrieved successfully',
      type: [SessionResponseDto],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
  );
}

export function ApiRevokeSession() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Revoke a specific session',
      description: 'Invalidate a specific session by ID. Cannot revoke the current session.',
    }),
    ApiParam({
      name: 'id',
      description: 'Session ID to revoke',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Session revoked successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Session revoked successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Cannot revoke current session' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Session not found' }),
  );
}
