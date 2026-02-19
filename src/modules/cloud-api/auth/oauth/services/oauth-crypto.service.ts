import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OAuthCryptoService {
  private readonly hmacSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.hmacSecret = this.configService.getOrThrow<string>('CSRF_HMAC_KEY');
  }

  // Generates a random 32-byte base64url string for PKCE code verifier
  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Generates a SHA-256 hash of the code verifier for PKCE challenge
  generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // Generates a random 32-byte hex string for OAuth state tokens
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Signs a state token with HMAC-SHA256, returns "token.signature"
  signToken(token: string): string {
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(token);
    const signature = hmac.digest('hex');
    return `${token}.${signature}`;
  }

  // Verifies the HMAC signature of a signed "token.signature" string
  verifyToken(signedToken: string): boolean {
    const parts = signedToken.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [token, providedSignature] = parts;
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(token);
    const expectedSignature = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }
}
