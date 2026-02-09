import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

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
    ApiQuery({
      name: 'code',
      description: 'Authorization code from OAuth provider',
      required: true,
      type: String,
    }),
    ApiQuery({
      name: 'state',
      description: 'State parameter for CSRF protection',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to frontend with access token on success, or to error page on failure.',
    }),
    ApiResponse({
      status: 400,
      description: 'Missing code or state parameter.',
    }),
  );
}

export function ApiLinkOAuthProvider() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Link OAuth provider to existing account',
      description:
        "Initiates the OAuth flow to link an additional OAuth provider to the authenticated user's account. Requires an onboarding token.",
    }),
    ApiParam({
      name: 'provider',
      description: 'OAuth provider name to link',
      example: 'google',
      enum: ['google', 'github', 'microsoft'],
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to OAuth provider authorization page.',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized. Invalid or missing onboarding token.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid OAuth provider.',
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
