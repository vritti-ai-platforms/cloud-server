import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiSubscribeToVerificationEvents() {
  return applyDecorators(
    ApiOperation({
      summary: 'Subscribe to mobile verification events via Server-Sent Events',
      description: `Real-time SSE endpoint for mobile verification status updates.
    Client connects after initiating verification and receives push notifications when:
    - Verification succeeds (webhook received valid token)
    - Verification fails (invalid token, phone mismatch)
    - Verification expires (10 minute timeout)

    Note: Uses query parameter authentication since EventSource API cannot send headers.`,
    }),
    ApiProduces('text/event-stream'),
    ApiQuery({
      name: 'token',
      required: true,
      description: 'JWT onboarding token for authentication',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'SSE connection established. Events will be streamed as verification status changes.',
      content: {
        'text/event-stream': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['SUCCESS', 'FAILED', 'EXPIRED'], description: 'Verification status' },
                  verificationId: { type: 'string', description: 'Unique verification identifier' },
                  phone: { type: 'string', description: 'Masked phone number' },
                  message: { type: 'string', description: 'Human-readable status message' },
                  timestamp: { type: 'string', format: 'date-time', description: 'Event timestamp' },
                },
              },
              id: { type: 'string', description: 'Event ID for reconnection' },
              type: { type: 'string', example: 'verification', description: 'Event type' },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token in query parameter' }),
    ApiResponse({ status: 404, description: 'Verification already completed or not found' }),
  );
}
