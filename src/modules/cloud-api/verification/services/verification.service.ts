import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@vritti/api-sdk';
import type { Verification, VerificationChannel } from '@/db/schema';
import { VerificationChannelValues } from '@/db/schema/enums';
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
  private readonly expiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly verificationRepo: VerificationRepository,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    this.expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
  }

  // Creates or updates a verification record; returns the secret to deliver to the user
  async createVerification(
    userId: string,
    channel: VerificationChannel,
    target: string | null,
  ): Promise<CreateVerificationResult> {
    const isOutboundVerification =
      channel === VerificationChannelValues.EMAIL || channel === VerificationChannelValues.SMS_OUT;

    const expiresAt = this.getOtpExpiryTime();

    const { code: otp, hash } = isOutboundVerification
      ? await this.encryptionService.issueOtp()
      : this.encryptionService.issueHexCode();

    const record = await this.verificationRepo.upsertByUserIdAndChannel(userId, channel, {
      target,
      hash,
      expiresAt,
    });

    this.logger.log(`Upserted ${channel} verification ${record.id} for user ${userId}`);

    return { verificationId: record.id, otp, expiresAt };
  }

  // Verifies a code for the given channel — throws on any failure, returns the verified record
  async verifyVerification(code: string, channel: VerificationChannel, userId?: string): Promise<Verification> {
    const isOutboundVerification =
      (channel === VerificationChannelValues.EMAIL || channel === VerificationChannelValues.SMS_OUT) && userId;

    const verification = isOutboundVerification
      ? await this.verificationRepo.findByUserIdAndChannel(userId, channel)
      : await this.verificationRepo.findByHashAndChannel(this.encryptionService.hmacDigestHexCode(code), channel);

    if (!verification) {
      throw new NotFoundException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    this.validateState(verification);

    if (isOutboundVerification) {
      const isValid = await this.encryptionService.compareOtp(code, verification.hash);

      if (!isValid) {
        await this.verificationRepo.incrementAttempts(verification.id);
        throw new UnauthorizedException({
          label: 'Invalid Code',
          detail: 'The verification code you entered is incorrect. Please check the code and try again.',
          errors: [{ field: 'code', message: 'Invalid verification code' }],
        });
      }
    }

    const verified = await this.verificationRepo.markAsVerified(verification.id);
    this.logger.log(`Verification ${verification.id} verified for user ${verification.userId} via ${channel} channel`);
    return verified;
  }

  // Finds a verification record for a user and channel
  async findByUserIdAndChannel(userId: string, channel: VerificationChannel): Promise<Verification | undefined> {
    return this.verificationRepo.findByUserIdAndChannel(userId, channel);
  }

  // Checks whether the target (email/phone) is already verified by a different user
  async isTargetVerifiedByOtherUser(target: string, excludeUserId?: string): Promise<boolean> {
    return this.verificationRepo.isTargetVerifiedByOtherUser(target, excludeUserId);
  }

  // Removes expired, unverified records (for scheduled cleanup)
  async deleteExpired(): Promise<number> {
    const count = await this.verificationRepo.deleteExpired();
    if (count > 0) {
      this.logger.log(`Deleted ${count} expired verification records`);
    }
    return count;
  }

  // Calculates the expiration timestamp from the current time
  private getOtpExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + this.expiryMinutes);
    return expiryTime;
  }

  // Throws if the verification is already used, expired, or has exceeded the attempt limit
  private validateState(verification: Verification): void {
    if (verification.isVerified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException({
        label: 'Code Expired',
        detail: 'Your verification code has expired. Please request a new code to continue.',
        errors: [{ field: 'code', message: 'Verification code expired' }],
      });
    }

    if (verification.attempts >= this.maxAttempts) {
      throw new BadRequestException({
        label: 'Too Many Attempts',
        detail:
          'You have exceeded the maximum number of verification attempts. Please request a new code to try again.',
        errors: [{ field: 'code', message: 'Maximum attempts exceeded' }],
      });
    }
  }
}
