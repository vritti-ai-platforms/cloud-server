import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiHandleOAuthCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'Handle OAuth callback',
      description:
        'Receives the authorization code from the OAuth provider after user authorization. Exchanges the code for tokens and creates a session.',
    }),
    ApiParam({
      name: 'provider',
      description: 'OAuth provider name',
      example: 'google',
      enum: ['google', 'github', 'microsoft'],
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to frontend with refresh cookie on success, or to error page on failure.',
    }),
    ApiResponse({
      status: 400,
      description: 'Missing or invalid code/state parameter.',
    }),
  );
}

export function ApiInitiateOAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate OAuth flow',
      description:
        "Initiates the OAuth authentication flow by redirecting the user to the specified OAuth provider's authorization page.",
    }),
    ApiParam({
      name: 'provider',
      description: 'OAuth provider name',
      example: 'google',
      enum: ['google', 'github', 'microsoft'],
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to OAuth provider authorization page.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or unsupported OAuth provider.',
    }),
  );
}
