export class BackupCodesResponseDto {
  success: boolean;
  message: string;
  backupCodes: string[];
  warning: string;

  constructor(partial: Partial<BackupCodesResponseDto>) {
    Object.assign(this, partial);
  }
}
