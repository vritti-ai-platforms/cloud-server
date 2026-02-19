import { Controller, Logger, MessageEvent, NotFoundException, Sse, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, SkipCsrf, SseAuthGuard, UserId } from '@vritti/api-sdk';
import { ApiSubscribeToVerificationEvents } from '../docs/verification-sse.docs';
import { Observable, finalize, map, takeUntil, timer } from 'rxjs';
import { MobileVerificationEvent } from '../events/verification.events';
import { MobileVerificationService } from '../services/mobile-verification.service';
import { SseConnectionService } from '../services/sse-connection.service';

@ApiTags('Onboarding - Verification Events')
@Controller('onboarding/mobile-verification')
export class VerificationSseController {
  private readonly logger = new Logger(VerificationSseController.name);

  constructor(
    private readonly sseConnectionService: SseConnectionService,
    private readonly mobileVerificationService: MobileVerificationService,
  ) {}

  // Opens an SSE stream that pushes real-time mobile verification status updates
  @Sse('events')
  @Public() // Bypass global VrittiAuthGuard (EventSource can't send headers)
  @SkipCsrf() // Bypass CSRF guard (EventSource can't send CSRF tokens)
  @UseGuards(SseAuthGuard) // Use guard that accepts token via query param & sets CORS headers
  @ApiSubscribeToVerificationEvents()
  async subscribeToVerificationEvents(@UserId() userId: string): Promise<Observable<MessageEvent>> {
    this.logger.log(`SSE connection requested by user ${userId}`);

    const verification = await this.mobileVerificationService.findLatestVerification(userId);

    if (!verification) {
      this.logger.warn(`No verification found for user ${userId}, rejecting SSE connection`);
      throw new NotFoundException('No verification found. Please initiate verification first.');
    }

    if (verification.isVerified) {
      this.logger.warn(`User ${userId} already verified, rejecting SSE connection`);
      throw new NotFoundException('Verification already completed');
    }

    const expiresAt = verification.expiresAt;

    const timeoutMs = Math.max(0, expiresAt.getTime() - Date.now());

    const subject = this.sseConnectionService.getOrCreateConnection(userId, expiresAt);

    return subject.pipe(
      takeUntil(timer(timeoutMs)),

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

      finalize(() => {
        this.logger.log(`SSE connection closed for user ${userId}`);
        this.sseConnectionService.closeConnection(userId);
      }),
    );
  }
}
