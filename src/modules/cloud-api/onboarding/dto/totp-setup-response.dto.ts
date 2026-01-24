export class TotpSetupResponseDto {
  qrCodeDataUrl: string;
  manualSetupKey: string;
  issuer: string;
  accountName: string;

  constructor(partial: Partial<TotpSetupResponseDto>) {
    Object.assign(this, partial);
  }
}
