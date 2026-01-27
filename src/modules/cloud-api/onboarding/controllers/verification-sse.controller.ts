import { Controller, Logger, MessageEvent, NotFoundException, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, SkipCsrf, SseAuthGuard, UserId } from '@vritti/api-sdk';
import { finalize, map, Observable, takeUntil, timer } from 'rxjs';
import { MobileVerificationEvent } from '../events/verification.events';
import { MobileVerificationService } from '../services/mobile-verification.service';
import { SseConnectionService } from '../services/sse-connection.service';

/**
 * SSE Controller for real-time verification status updates
 * Replaces polling with push-based notifications
 */
@ApiTags('Onboarding - Verification Events')
@Controller('onboarding/mobile-verification')
export class VerificationSseController {
  private readonly logger = new Logger(VerificationSseController.name);

  constructor(
    private readonly sseConnectionService: SseConnectionService,
    private readonly mobileVerificationService: MobileVerificationService,
  ) {}

  /**
   * SSE endpoint for mobile verification status
   * GET /onboarding/mobile-verification/events?token=<jwt>
   *
   * Client connects here after initiating verification.
   * Server pushes events when:
   * - Verification succeeds (webhook received valid token)
   * - Verification fails (invalid token, phone mismatch)
   * - Verification expires (10 minute timeout)
   *
   * Connection auto-closes on:
   * - Verification completion (success or failure)
   * - Expiry timeout
   * - Client disconnect
   */
  @Sse('events')
  @Public() // Bypass global VrittiAuthGuard (EventSource can't send headers)
  @SkipCsrf() // Bypass CSRF guard (EventSource can't send CSRF tokens)
  @UseGuards(SseAuthGuard) // Use guard that accepts token via query param & sets CORS headers
  @ApiOperation({
    summary: 'Subscribe to mobile verification events via Server-Sent Events',
    description: `Real-time SSE endpoint for mobile verification status updates.
    Client connects after initiating verification and receives push notifications when:
    - Verification succeeds (webhook received valid token)
    - Verification fails (invalid token, phone mismatch)
    - Verification expires (10 minute timeout)

    Note: Uses query parameter authentication since EventSource API cannot send headers.`,
  })
  @ApiProduces('text/event-stream')
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'JWT onboarding token for authentication',
    type: String,
  })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token in query parameter' })
  @ApiResponse({ status: 404, description: 'Verification already completed or not found' })
  async subscribeToVerificationEvents(@UserId() userId: string): Promise<Observable<MessageEvent>> {
    this.logger.log(`SSE connection requested by user ${userId}`);

    // Get current verification to determine expiry time
    let expiresAt: Date;
    try {
      const verification = await this.mobileVerificationService.getVerificationStatus(userId);
      expiresAt = new Date(verification.expiresAt);

      // If already verified, don't allow connection
      if (verification.isVerified) {
        this.logger.warn(`User ${userId} already verified, rejecting SSE connection`);
        throw new NotFoundException('Verification already completed');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // If no verification found, use default 10 minute expiry
      expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }

    // Calculate timeout duration
    const timeoutMs = Math.max(0, expiresAt.getTime() - Date.now());

    // Get or create subject for this user
    const subject = this.sseConnectionService.getOrCreateConnection(userId, expiresAt);

    // Transform events to SSE MessageEvent format
    return subject.pipe(
      // Auto-close after verification expiry
      takeUntil(timer(timeoutMs)),

      // Map to SSE MessageEvent format
      map(
        (event: MobileVerificationEvent): MessageEvent => ({
          data: {
            type: event.status,
            verificationId: event.verificationId,
            phone: event.phone,
            message: event.message,
            timestamp: new Date().toISOString(),
          },
          id: `${event.verificationId}-${Date.now()}`,
          type: 'verification',
        }),
      ),

      // Cleanup on disconnect or completion
      finalize(() => {
        this.logger.log(`SSE connection closed for user ${userId}`);
        this.sseConnectionService.closeConnection(userId);
      }),
    );
  }
}
