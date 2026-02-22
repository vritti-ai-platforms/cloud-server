import { Injectable, Logger, type MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

interface UserConnection {
  subject: Subject<MessageEvent>;
  expiresAt: Date;
  createdAt: Date;
  expiryTimer?: NodeJS.Timeout;
}

@Injectable()
export class SseConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(SseConnectionService.name);
  private readonly connections = new Map<string, UserConnection>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupExpiredConnections(), 60000);
  }

  // Completes all active SSE subjects and clears the connection map on shutdown
  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    for (const [, connection] of this.connections) {
      if (connection.expiryTimer) clearTimeout(connection.expiryTimer);
      connection.subject.complete();
    }
    this.connections.clear();
  }

  // Returns an existing SSE subject for the user or creates a new one
  getOrCreateConnection(userId: string, expiresAt: Date): Subject<MessageEvent> {
    const existing = this.connections.get(userId);

    if (existing && !existing.subject.closed) {
      this.logger.debug(`Reusing existing SSE connection for user ${userId}`);
      return existing.subject;
    }

    const subject = new Subject<MessageEvent>();
    this.connections.set(userId, {
      subject,
      expiresAt,
      createdAt: new Date(),
    });

    this.logger.log(`Created new SSE connection for user ${userId}, expires at ${expiresAt.toISOString()}`);
    return subject;
  }

  // Pushes a verification event to the user's SSE stream if connected
  sendToUser(userId: string, event: MessageEvent): boolean {
    const connection = this.connections.get(userId);

    if (!connection || connection.subject.closed) {
      this.logger.debug(`No active SSE connection for user ${userId} - they may be using polling`);
      return false;
    }

    this.logger.log(`Sending verification event to user ${userId}: ${event.type}`);
    connection.subject.next(event);
    return true;
  }

  // Completes the user's SSE subject, cancels any pending expiry timer, and removes the connection from the map
  closeConnection(userId: string): void {
    const connection = this.connections.get(userId);

    if (connection) {
      if (connection.expiryTimer) clearTimeout(connection.expiryTimer);
      connection.subject.complete();
      this.connections.delete(userId);
      this.logger.log(`Closed SSE connection for user ${userId}`);
    }
  }

  // Associates a pending expiry timer with the user's connection so it can be cancelled on close
  registerExpiryTimer(userId: string, timer: NodeJS.Timeout): void {
    const connection = this.connections.get(userId);

    if (!connection) {
      // Connection already gone before timer was registered — disarm it immediately
      clearTimeout(timer);
      return;
    }

    if (connection.expiryTimer) clearTimeout(connection.expiryTimer);
    connection.expiryTimer = timer;
  }

  // Checks whether the user has an active, non-closed SSE connection
  hasConnection(userId: string): boolean {
    const connection = this.connections.get(userId);
    return !!connection && !connection.subject.closed;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  private cleanupExpiredConnections(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, connection] of this.connections) {
      if (connection.expiresAt < now || connection.subject.closed) {
        if (connection.expiryTimer) clearTimeout(connection.expiryTimer);
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
