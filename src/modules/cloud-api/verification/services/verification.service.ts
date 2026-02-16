import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@vritti/api-sdk';
import type { Verification, VerificationChannel } from '@/db/schema';
import { VerificationRepository } from '../repositories/verification.repository';
import { OtpService } from './otp.service';

export interface CreateVerificationResult {
  verificationId: string;
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly verificationRepo: VerificationRepository,
    private readonly otpService: OtpService,
  ) {}

  // Creates a verification record and returns the verificationId + plaintext OTP for the caller to send
  async createVerification(
    userId: string,
    channel: VerificationChannel,
    target: string,
  ): Promise<CreateVerificationResult> {
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otp);
    const expiresAt = this.otpService.getOtpExpiryTime();

    const record = await this.verificationRepo.create({
      userId,
      channel,
      target,
      otp: hashedOtp,
      expiresAt,
    });

    this.logger.log(`Created ${channel} verification ${record.id} for user ${userId}`);

    return { verificationId: record.id, otp, expiresAt };
  }

  // Validates OTP against stored hash — handles expiry, attempts, and incrementing
  async verifyOtp(verificationId: string, userId: string, otp: string): Promise<void> {
    const verification = await this.verificationRepo.findById(verificationId);

    if (!verification || verification.userId !== userId) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (verification.isVerified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    this.otpService.validateOtpAttempt(verification);

    const isValid = await this.otpService.verifyOtp(otp, verification.otp);

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
    const verification = await this.verificationRepo.findLatestByUserIdAndChannel(userId, channel);

    if (!verification) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (verification.isVerified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    this.otpService.validateOtpAttempt(verification);

    const isValid = await this.otpService.verifyOtp(otp, verification.otp);

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

  // Deletes the old verification and creates a new one with the same channel/target
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

    await this.verificationRepo.delete(verificationId);

    return this.createVerification(userId, existing.channel, existing.target);
  }

  // Deletes the old verification and creates a new one by looking up via userId + channel
  async resendVerificationByChannel(userId: string, channel: VerificationChannel): Promise<CreateVerificationResult> {
    const existing = await this.verificationRepo.findLatestByUserIdAndChannel(userId, channel);

    if (!existing) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    if (existing.isVerified) {
      throw new BadRequestException('This verification has already been completed.');
    }

    await this.verificationRepo.delete(existing.id);

    return this.createVerification(userId, existing.channel, existing.target);
  }

  // Retrieves a verification record by ID
  async findById(verificationId: string): Promise<Verification | undefined> {
    return this.verificationRepo.findById(verificationId);
  }

  // Generates a random alphanumeric verification token
  generateVerificationToken(): string {
    return this.otpService.generateVerificationToken();
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
