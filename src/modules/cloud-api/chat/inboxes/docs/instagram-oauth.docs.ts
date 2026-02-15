import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiInstagramAuthorize() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Instagram OAuth authorization URL',
      description:
        'Generates the Instagram OAuth authorization URL for the current tenant and user. ' +
        'The frontend should redirect the user to this URL to begin the Instagram connection flow.',
    }),
    ApiResponse({
      status: 200,
      description: 'Authorization URL generated successfully.',
      schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            example: 'https://api.instagram.com/oauth/authorize?client_id=...&state=...',
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiInstagramCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'Handle Instagram OAuth callback',
      description:
        'Handles the redirect from Instagram after the user authorizes the app. ' +
        'Exchanges the authorization code for tokens, fetches the user profile, ' +
        'creates or reconnects the inbox, and redirects to the frontend.',
    }),
    ApiQuery({
      name: 'code',
      required: false,
      type: String,
      description: 'Authorization code from Instagram',
    }),
    ApiQuery({
      name: 'state',
      required: false,
      type: String,
      description: 'JWT state token for CSRF protection',
    }),
    ApiQuery({
      name: 'error',
      required: false,
      type: String,
      description: 'Error code if the user denied authorization',
    }),
    ApiQuery({
      name: 'error_reason',
      required: false,
      type: String,
      description: 'Reason for the error',
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to the frontend success or error page.',
    }),
  );
}
