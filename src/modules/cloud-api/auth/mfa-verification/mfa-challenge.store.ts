import { Injectable, Logger } from '@nestjs/common';

/**
 * MFA method types
 */
export type MfaMethod = 'totp' | 'sms' | 'passkey';

/**
 * MFA Challenge - represents a pending MFA verification challenge
 */
export interface MfaChallenge {
  sessionId: string;
  userId: string;
  availableMethods: MfaMethod[];
  defaultMethod: MfaMethod;
  maskedPhone?: string;
  passkeyChallenge?: string; // For passkey authentication
  smsOtpHash?: string; // Hashed OTP for SMS verification
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * In-memory store for MFA challenges with 5-minute TTL
 * In production, consider using Redis with TTL for distributed systems
 */
@Injectable()
export class MfaChallengeStore {
  private readonly logger = new Logger(MfaChallengeStore.name);
  private readonly challenges = new Map<string, MfaChallenge>();
  private readonly MFA_CHALLENGE_TTL_MINUTES = 5;

  /**
   * Create a new MFA challenge
   */
  create(
    userId: string,
    availableMethods: MfaMethod[],
    options: {
      maskedPhone?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): MfaChallenge {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.MFA_CHALLENGE_TTL_MINUTES);

    // Determine default method (prefer TOTP > SMS > Passkey)
    let defaultMethod: MfaMethod = 'totp';
    if (availableMethods.includes('totp')) {
      defaultMethod = 'totp';
    } else if (availableMethods.includes('sms')) {
      defaultMethod = 'sms';
    } else if (availableMethods.includes('passkey')) {
      defaultMethod = 'passkey';
    }

    const challenge: MfaChallenge = {
      sessionId,
      userId,
      availableMethods,
      defaultMethod,
      maskedPhone: options.maskedPhone,
      expiresAt,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    this.challenges.set(sessionId, challenge);
    this.logger.debug(`Created MFA challenge for user: ${userId}, sessionId: ${sessionId}`);

    // Schedule cleanup
    this.scheduleCleanup(sessionId);

    return challenge;
  }

  /**
   * Get an MFA challenge by session ID
   */
  get(sessionId: string): MfaChallenge | undefined {
    const challenge = this.challenges.get(sessionId);

    if (!challenge) {
      return undefined;
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      this.delete(sessionId);
      return undefined;
    }

    return challenge;
  }

  /**
   * Update an MFA challenge (e.g., to add passkey challenge or SMS OTP hash)
   */
  update(sessionId: string, updates: Partial<Pick<MfaChallenge, 'passkeyChallenge' | 'smsOtpHash'>>): MfaChallenge | undefined {
    const challenge = this.get(sessionId);
    if (!challenge) {
      return undefined;
    }

    const updatedChallenge = { ...challenge, ...updates };
    this.challenges.set(sessionId, updatedChallenge);
    return updatedChallenge;
  }

  /**
   * Delete an MFA challenge
   */
  delete(sessionId: string): boolean {
    const deleted = this.challenges.delete(sessionId);
    if (deleted) {
      this.logger.debug(`Deleted MFA challenge: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Schedule automatic cleanup after TTL
   */
  private scheduleCleanup(sessionId: string): void {
    setTimeout(
      () => {
        if (this.challenges.has(sessionId)) {
          this.challenges.delete(sessionId);
          this.logger.debug(`Auto-cleaned expired MFA challenge: ${sessionId}`);
        }
      },
      this.MFA_CHALLENGE_TTL_MINUTES * 60 * 1000,
    );
  }

  /**
   * Get TTL in minutes (for external reference)
   */
  getTtlMinutes(): number {
    return this.MFA_CHALLENGE_TTL_MINUTES;
  }
}
