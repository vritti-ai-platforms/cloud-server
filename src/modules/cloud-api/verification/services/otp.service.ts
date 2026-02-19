import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { TIME_CONSTANTS } from '../../../../constants/time-constants';
import { EncryptionService } from '../../../../services';

@Injectable()
export class OtpService {
  private readonly OTP_EXPIRY_MINUTES = TIME_CONSTANTS.OTP_EXPIRY_MINUTES;
  private readonly MAX_ATTEMPTS = TIME_CONSTANTS.MAX_OTP_ATTEMPTS;

  constructor(private readonly encryptionService: EncryptionService) {}

  // Generates a random numeric OTP string
  generateOtp(): string {
    return this.encryptionService.generateOtp();
  }

  // Generates a random alphanumeric verification token
  generateVerificationToken(): string {
    return this.encryptionService.generateVerificationToken();
  }

  // Hashes the OTP for secure storage
  async hashOtp(otp: string): Promise<string> {
    return await this.encryptionService.hashOtp(otp);
  }

  // Compares a plain OTP against its hashed counterpart
  async verifyOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
    return await this.encryptionService.compareOtp(plainOtp, hashedOtp);
  }

  // Calculates the OTP expiration timestamp from the current time
  getOtpExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiryTime;
  }

  // Checks whether the OTP has passed its expiration time
  isOtpExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  // Checks whether the maximum number of OTP attempts has been reached
  isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.MAX_ATTEMPTS;
  }

  // Throws if the OTP is expired or the maximum attempts have been exceeded
  validateOtpAttempt(verification: { attempts: number; expiresAt: Date }): void {
    if (this.isOtpExpired(verification.expiresAt)) {
      throw new BadRequestException({
        label: 'Code Expired',
        detail: 'Your verification code has expired. Please request a new code to continue.',
        errors: [{ field: 'code', message: 'Verification code expired' }],
      });
    }

    if (this.isMaxAttemptsExceeded(verification.attempts)) {
      throw new BadRequestException({
        label: 'Too Many Attempts',
        detail: 'You have exceeded the maximum number of verification attempts. Please request a new code to try again.',
        errors: [{ field: 'code', message: 'Maximum attempts exceeded' }],
      });
    }
  }
}
