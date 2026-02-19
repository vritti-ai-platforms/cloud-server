import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@vritti/api-sdk';
import type { Verification, VerificationChannel } from '@/db/schema';
import { TIME_CONSTANTS } from '../../../../constants/time-constants';
import { EncryptionService } from '../../../../services';
import { VerificationRepository } from '../repositories/verification.repository';

export interface CreateVerificationResult {
  verificationId: string;
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly OTP_EXPIRY_MINUTES = TIME_CONSTANTS.OTP_EXPIRY_MINUTES;
  private readonly MAX_ATTEMPTS = TIME_CONSTANTS.MAX_OTP_ATTEMPTS;

  constructor(
    private readonly verificationRepo: VerificationRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

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
  private async verifyOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
    return await this.encryptionService.compareOtp(plainOtp, hashedOtp);
  }

  // Calculates the OTP expiration timestamp from the current time
  getOtpExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiryTime;
  }

  // Checks whether the OTP has passed its expiration time
  private isOtpExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  // Checks whether the maximum number of OTP attempts has been reached
  private isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.MAX_ATTEMPTS;
  }

  // Throws if the OTP is expired or the maximum attempts have been exceeded
  private validateOtpAttempt(verification: { attempts: number; expiresAt: Date }): void {
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

  // Creates or updates a verification record and returns the verificationId + plaintext OTP for the caller to send
  async createVerification(
    userId: string,
    channel: VerificationChannel,
    target: string,
  ): Promise<CreateVerificationResult> {
    const otp = this.generateOtp();
    const hashedOtp = await this.hashOtp(otp);
    const expiresAt = this.getOtpExpiryTime();

    const record = await this.verificationRepo.upsertByUserIdAndChannel(userId, channel, {
      target,
      hashedOtp,
      expiresAt,
    });

    this.logger.log(`Upserted ${channel} verification ${record.id} for user ${userId}`);

    return { verificationId: record.id, otp, expiresAt };
  }

  // Validates OTP against stored hash — handles expiry, attempts, and incrementing
  async validateOtp(verificationId: string, userId: string, otp: string): Promise<void> {
    const verification = await this.verificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (verification.isVerified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    this.validateOtpAttempt(verification);

    const isValid = await this.verifyOtp(otp, verification.hashedOtp!);

    if (!isValid) {
      await this.verificationRepo.incrementAttempts(verificationId);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The verification code you entered is incorrect. Please check the code and try again.',
        errors: [{ field: 'code', message: 'Invalid verification code' }],
      });
    }

    await this.verificationRepo.markAsVerified(verificationId);
    this.logger.log(`Verification ${verificationId} verified for user ${userId}`);
  }

  // Validates OTP by looking up verification by userId and channel
  async verifyOtpByChannel(userId: string, channel: VerificationChannel, otp: string): Promise<void> {
    const verification = await this.verificationRepo.findByUserIdAndChannel(userId, channel);

    if (!verification) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (verification.isVerified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    this.validateOtpAttempt(verification);

    const isValid = await this.verifyOtp(otp, verification.hashedOtp!);

    if (!isValid) {
      await this.verificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The verification code you entered is incorrect. Please check the code and try again.',
        errors: [{ field: 'code', message: 'Invalid verification code' }],
      });
    }

    await this.verificationRepo.markAsVerified(verification.id);
    this.logger.log(`Verification ${verification.id} verified for user ${userId} via ${channel} channel`);
  }

  // Resets verification state and generates a new OTP (reuses same record via upsert)
  async resendVerification(verificationId: string, userId: string): Promise<CreateVerificationResult> {
    const existing = await this.verificationRepo.findById(verificationId);

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (existing.isVerified) {
      throw new BadRequestException('This verification has already been completed.');
    }

    if (!existing.target) {
      throw new BadRequestException('Cannot resend verification without a target.');
    }

    return this.createVerification(userId, existing.channel, existing.target);
  }

  // Resets verification state and generates a new OTP (reuses same record via upsert)
  async resendVerificationByChannel(userId: string, channel: VerificationChannel): Promise<CreateVerificationResult> {
    const existing = await this.verificationRepo.findByUserIdAndChannel(userId, channel);

    if (!existing) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (existing.isVerified) {
      throw new BadRequestException('This verification has already been completed.');
    }

    if (!existing.target) {
      throw new BadRequestException('Cannot resend verification without a target.');
    }

    return this.createVerification(userId, existing.channel, existing.target);
  }

  // Retrieves a verification record by ID
  async findById(verificationId: string): Promise<Verification | undefined> {
    return this.verificationRepo.findById(verificationId);
  }

  // Looks up a verification record by its verificationId token and channel
  async findByVerificationIdAndChannel(
    verificationId: string,
    channel: VerificationChannel,
  ): Promise<Verification | undefined> {
    return this.verificationRepo.findByVerificationIdAndChannel(verificationId, channel);
  }

  // Checks whether the target (email/phone) is already verified by a different user
  async isTargetVerifiedByOtherUser(target: string, excludeUserId?: string): Promise<boolean> {
    return this.verificationRepo.isTargetVerifiedByOtherUser(target, excludeUserId);
  }

  // Updates the target field on a verification record
  async updateTarget(id: string, target: string): Promise<Verification> {
    return this.verificationRepo.update(id, { target });
  }

  // Marks a verification as verified with the current timestamp
  async markAsVerified(id: string): Promise<Verification> {
    return this.verificationRepo.markAsVerified(id);
  }

  // Atomically increments the attempt counter for a verification record
  async incrementAttempts(id: string): Promise<Verification> {
    return this.verificationRepo.incrementAttempts(id);
  }

  // Removes expired, unverified records (for scheduled cleanup)
  async deleteExpired(): Promise<number> {
    const count = await this.verificationRepo.deleteExpired();
    if (count > 0) {
      this.logger.log(`Deleted ${count} expired verification records`);
    }
    return count;
  }
}
