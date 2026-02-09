import { ApiProperty } from '@nestjs/swagger';

export class TotpSetupResponseDto {
  @ApiProperty({
    description: 'Base64-encoded data URL of the QR code image for scanning with authenticator apps',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCodeDataUrl: string;

  @ApiProperty({
    description: 'Manual setup key for users who cannot scan the QR code, to be entered manually in authenticator app',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manualSetupKey: string;

  @ApiProperty({
    description: 'Name of the service/application issuing the TOTP',
    example: 'Vritti',
  })
  issuer: string;

  @ApiProperty({
    description: 'Account identifier displayed in the authenticator app, typically the user email',
    example: 'john.doe@example.com',
  })
  accountName: string;

  constructor(partial: Partial<TotpSetupResponseDto>) {
    Object.assign(this, partial);
  }
}
