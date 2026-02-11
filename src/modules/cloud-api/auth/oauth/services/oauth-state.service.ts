import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@vritti/api-sdk';
import type { OAuthProviderType } from '@/db/schema';
import type { OAuthStateData } from '../interfaces/oauth-state.interface';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly hmacSecret: string;
  private readonly STATE_EXPIRY_MINUTES = 10;

  constructor(
    private readonly stateRepository: OAuthStateRepository,
    private readonly configService: ConfigService,
  ) {
    this.hmacSecret = this.configService.getOrThrow<string>('CSRF_HMAC_KEY');
  }

  // Generates a signed state token with PKCE verifier and stores it in the database
  async generateState(provider: OAuthProviderType, userId: string | undefined, codeVerifier: string): Promise<string> {
    // Generate cryptographically secure random state token
    const stateToken = crypto.randomBytes(32).toString('hex');

    // Sign state token with HMAC
    const signedStateToken = this.signStateToken(stateToken);

    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.STATE_EXPIRY_MINUTES);

    // Store in database
    await this.stateRepository.create({
      stateToken: signedStateToken,
      provider,
      userId,
      codeVerifier,
      expiresAt,
    });

    this.logger.log(`Generated OAuth state for provider: ${provider}, userId: ${userId || 'none'}`);

    return signedStateToken;
  }

  // Validates the HMAC signature, checks expiry, and consumes the one-time state token
  async validateAndConsumeState(stateToken: string): Promise<OAuthStateData> {
    // Verify HMAC signature
    if (!this.verifyStateToken(stateToken)) {
      this.logger.warn('Invalid OAuth state token signature');
      throw new UnauthorizedException(
        'The authentication request could not be verified. Please try logging in again.',
      );
    }

    // Query database for state record
    const stateRecord = await this.stateRepository.findByToken(stateToken);

    if (!stateRecord) {
      this.logger.warn('OAuth state token not found in database');
      throw new UnauthorizedException(
        'Your authentication session has expired or is invalid. Please try logging in again.',
      );
    }

    // Check expiry
    if (new Date() > stateRecord.expiresAt) {
      // Delete expired state
      await this.stateRepository.delete(stateRecord.id);
      this.logger.warn('OAuth state token expired');
      throw new UnauthorizedException(
        'Your authentication session has expired. Please try logging in again.',
      );
    }

    // Delete state (one-time use)
    await this.stateRepository.delete(stateRecord.id);

    this.logger.log(`Validated and consumed OAuth state for provider: ${stateRecord.provider}`);

    // Return state data
    return {
      provider: stateRecord.provider,
      userId: stateRecord.userId || undefined,
      codeVerifier: stateRecord.codeVerifier,
    };
  }

  // Removes all expired OAuth state records from the database
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.stateRepository.deleteExpired();

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired OAuth states`);
    }

    return result.count;
  }

  private signStateToken(stateToken: string): string {
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(stateToken);
    const signature = hmac.digest('hex');
    return `${stateToken}.${signature}`;
  }

  private verifyStateToken(signedStateToken: string): boolean {
    const parts = signedStateToken.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [stateToken, providedSignature] = parts;
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(stateToken);
    const expectedSignature = hmac.digest('hex');

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }
}
