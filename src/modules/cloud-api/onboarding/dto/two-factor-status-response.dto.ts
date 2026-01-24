import type { TwoFactorMethod } from '@/db/schema';

export class TwoFactorStatusResponseDto {
  isEnabled: boolean;
  method: TwoFactorMethod | null;
  backupCodesRemaining: number;
  lastUsedAt: Date | null;
  createdAt: Date | null;

  constructor(partial: Partial<TwoFactorStatusResponseDto>) {
    Object.assign(this, partial);
  }
}
