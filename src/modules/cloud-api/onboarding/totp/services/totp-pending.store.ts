import { Injectable, Logger } from '@nestjs/common';

interface PendingTotpSetup {
  secret: string;
  expiresAt: Date;
}

@Injectable()
export class TotpPendingStore {
  private readonly logger = new Logger(TotpPendingStore.name);
  private readonly pendingSetups = new Map<string, PendingTotpSetup>();

  // Stores a pending TOTP secret for a user with a TTL-based expiry
  set(userId: string, secret: string, expiresAt: Date): void {
    this.pendingSetups.set(userId, { secret, expiresAt });
    this.scheduleCleanup(userId, expiresAt);
  }

  // Returns the pending setup if it exists and has not expired
  get(userId: string): PendingTotpSetup | undefined {
    const pending = this.pendingSetups.get(userId);
    if (!pending) return undefined;

    if (new Date() > pending.expiresAt) {
      this.pendingSetups.delete(userId);
      this.logger.debug(`Auto-expired TOTP pending setup for user: ${userId}`);
      return undefined;
    }

    return pending;
  }

  // Removes the pending TOTP setup for a user
  delete(userId: string): void {
    this.pendingSetups.delete(userId);
  }

  private scheduleCleanup(userId: string, expiresAt: Date): void {
    const ttlMs = expiresAt.getTime() - Date.now();
    setTimeout(() => {
      if (this.pendingSetups.has(userId)) {
        this.pendingSetups.delete(userId);
        this.logger.debug(`Auto-cleaned expired TOTP pending setup for user: ${userId}`);
      }
    }, ttlMs);
  }
}
