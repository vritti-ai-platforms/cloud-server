import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { ChangeRequestRateLimitRepository } from '../repositories/change-request-rate-limit.repository';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly MAX_REQUESTS_PER_DAY = 3;

  constructor(private readonly rateLimitRepo: ChangeRequestRateLimitRepository) {}

  // Checks daily limit and increments counter; throws if limit exceeded
  async checkAndIncrementChangeRequestLimit(
    userId: string,
    changeType: 'email' | 'phone',
  ): Promise<{ allowed: boolean; requestsToday: number }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Find or create rate limit record for today
    let rateLimit = await this.rateLimitRepo.findByUserAndDate(userId, changeType, today);

    if (!rateLimit) {
      rateLimit = await this.rateLimitRepo.create({
        userId,
        changeType,
        date: today,
        requestCount: 0,
      });
    }

    const newCount = rateLimit.requestCount + 1;
    const allowed = newCount <= this.MAX_REQUESTS_PER_DAY;

    if (!allowed) {
      this.logger.warn(
        `User ${userId} exceeded daily ${changeType} change request limit (${rateLimit.requestCount}/${this.MAX_REQUESTS_PER_DAY})`,
      );
      throw new BadRequestException({
        label: 'Rate Limit Exceeded',
        detail: `You can only make ${this.MAX_REQUESTS_PER_DAY} ${changeType} change requests per day. Please try again tomorrow.`,
      });
    }

    // Increment count
    await this.rateLimitRepo.incrementCount(rateLimit.id);

    this.logger.log(`${changeType} change request ${newCount}/${this.MAX_REQUESTS_PER_DAY} for user ${userId}`);

    return { allowed, requestsToday: newCount };
  }

  // Returns the current daily change request count for the given user and type
  async getCurrentRequestCount(userId: string, changeType: 'email' | 'phone'): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const rateLimit = await this.rateLimitRepo.findByUserAndDate(userId, changeType, today);
    return rateLimit?.requestCount ?? 0;
  }
}
