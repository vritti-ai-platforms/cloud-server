import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly saltRounds = 10;

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      this.logger.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      this.logger.error('Failed to hash password', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare a plain password with a hashed password
   */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error('Failed to compare passwords', error);
      throw new Error('Failed to compare passwords');
    }
  }

  /**
   * Hash an OTP using bcrypt (lighter salt rounds for faster generation)
   */
  async hashOtp(otp: string): Promise<string> {
    try {
      // Use fewer salt rounds for OTPs since they're temporary
      const hash = await bcrypt.hash(otp, 6);
      this.logger.debug('OTP hashed successfully');
      return hash;
    } catch (error) {
      this.logger.error('Failed to hash OTP', error);
      throw new Error('Failed to hash OTP');
    }
  }

  /**
   * Compare a plain OTP with a hashed OTP
   */
  async compareOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainOtp, hashedOtp);
    } catch (error) {
      this.logger.error('Failed to compare OTPs', error);
      throw new Error('Failed to compare OTPs');
    }
  }

  /**
   * Generate a random 6-digit OTP
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
