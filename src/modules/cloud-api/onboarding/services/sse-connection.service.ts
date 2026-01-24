import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MobileVerificationEvent } from '../events/verification.events';

interface UserConnection {
  subject: Subject<MobileVerificationEvent>;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Manages SSE connections per user for verification events
 * Handles connection lifecycle, cleanup, and event routing
 */
@Injectable()
export class SseConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(SseConnectionService.name);
  private readonly connections = new Map<string, UserConnection>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup stale connections every minute
    this.cleanupInterval = setInterval(() => this.cleanupExpiredConnections(), 60000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    // Complete all subjects on shutdown
    for (const [, connection] of this.connections) {
      connection.subject.complete();
    }
    this.connections.clear();
  }

  /**
   * Create or get existing connection for a user
   * @param userId User ID
   * @param expiresAt Connection expiry time (should match verification expiry)
   */
  getOrCreateConnection(userId: string, expiresAt: Date): Subject<MobileVerificationEvent> {
    const existing = this.connections.get(userId);

    if (existing && !existing.subject.closed) {
      this.logger.debug(`Reusing existing SSE connection for user ${userId}`);
      return existing.subject;
    }

    const subject = new Subject<MobileVerificationEvent>();
    this.connections.set(userId, {
      subject,
      expiresAt,
      createdAt: new Date(),
    });

    this.logger.log(`Created new SSE connection for user ${userId}, expires at ${expiresAt.toISOString()}`);
    return subject;
  }

  /**
   * Send event to a specific user's connection
   * @param userId User ID to send event to
   * @param event Verification event
   */
  sendToUser(userId: string, event: MobileVerificationEvent): boolean {
    const connection = this.connections.get(userId);

    if (!connection || connection.subject.closed) {
      this.logger.debug(`No active SSE connection for user ${userId} - they may be using polling`);
      return false;
    }

    this.logger.log(`Sending verification event to user ${userId}: ${event.status}`);
    connection.subject.next(event);
    return true;
  }

  /**
   * Complete and remove a user's connection
   * Call this after verification completes or on explicit disconnect
   */
  closeConnection(userId: string): void {
    const connection = this.connections.get(userId);

    if (connection) {
      connection.subject.complete();
      this.connections.delete(userId);
      this.logger.log(`Closed SSE connection for user ${userId}`);
    }
  }

  /**
   * Check if user has an active connection
   */
  hasConnection(userId: string): boolean {
    const connection = this.connections.get(userId);
    return !!connection && !connection.subject.closed;
  }

  /**
   * Get connection count (for monitoring)
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Cleanup expired connections
   */
  private cleanupExpiredConnections(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, connection] of this.connections) {
      if (connection.expiresAt < now || connection.subject.closed) {
        connection.subject.complete();
        this.connections.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired SSE connections`);
    }
  }
}
