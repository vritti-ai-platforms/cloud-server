import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VERIFICATION_EVENTS, MobileVerificationEvent } from '../events/verification.events';
import { SseConnectionService } from './sse-connection.service';

/**
 * Listens for verification events and forwards them to SSE connections
 */
@Injectable()
export class VerificationEventListener {
  private readonly logger = new Logger(VerificationEventListener.name);

  constructor(private readonly sseConnectionService: SseConnectionService) {}

  @OnEvent(VERIFICATION_EVENTS.MOBILE_VERIFIED)
  handleMobileVerified(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_VERIFIED event for user ${event.userId}`);
    const sent = this.sseConnectionService.sendToUser(event.userId, event);

    if (sent) {
      // Close connection after successful verification
      // Small delay to ensure client receives the event
      setTimeout(() => {
        this.sseConnectionService.closeConnection(event.userId);
      }, 100);
    }
  }

  @OnEvent(VERIFICATION_EVENTS.MOBILE_FAILED)
  handleMobileFailed(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_FAILED event for user ${event.userId}`);
    this.sseConnectionService.sendToUser(event.userId, event);
    // Don't close connection on failure - user might retry
  }

  @OnEvent(VERIFICATION_EVENTS.MOBILE_EXPIRED)
  handleMobileExpired(event: MobileVerificationEvent) {
    this.logger.log(`Handling MOBILE_EXPIRED event for user ${event.userId}`);
    const sent = this.sseConnectionService.sendToUser(event.userId, event);

    if (sent) {
      this.sseConnectionService.closeConnection(event.userId);
    }
  }
}
