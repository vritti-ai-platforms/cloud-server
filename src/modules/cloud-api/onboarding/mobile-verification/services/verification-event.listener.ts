import { Injectable, Logger, type MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VERIFICATION_EVENTS, MobileVerificationEvent } from '../events/verification.events';
import { SseConnectionService } from './sse-connection.service';

@Injectable()
export class VerificationEventListener {
  private readonly logger = new Logger(VerificationEventListener.name);

  constructor(private readonly sseConnectionService: SseConnectionService) {}

  // Forwards the verified event to the SSE stream and closes the connection
  @OnEvent(VERIFICATION_EVENTS.MOBILE_VERIFIED)
  handleMobileVerified(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_VERIFIED event for user ${event.userId}`);

    const message: MessageEvent = {
      type: 'verified',
      data: JSON.stringify({ phone: event.phone }),
    };

    const sent = this.sseConnectionService.sendToUser(event.userId, message);

    if (sent) {
      setTimeout(() => {
        this.sseConnectionService.closeConnection(event.userId);
      }, 100);
    }
  }

  // Forwards the failure event to the SSE stream without closing the connection
  @OnEvent(VERIFICATION_EVENTS.MOBILE_FAILED)
  handleMobileFailed(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_FAILED event for user ${event.userId}`);

    const message: MessageEvent = {
      type: 'error',
      data: JSON.stringify({ message: event.message ?? 'Verification failed' }),
    };

    this.sseConnectionService.sendToUser(event.userId, message);
    // Don't close connection on failure - user might retry
  }

  // Forwards the expiration event to the SSE stream and closes the connection
  @OnEvent(VERIFICATION_EVENTS.MOBILE_EXPIRED)
  handleMobileExpired(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_EXPIRED event for user ${event.userId}`);

    const message: MessageEvent = {
      type: 'expired',
      data: JSON.stringify({ message: event.message ?? 'Verification expired' }),
    };

    const sent = this.sseConnectionService.sendToUser(event.userId, message);

    if (sent) {
      this.sseConnectionService.closeConnection(event.userId);
    }
  }
}
