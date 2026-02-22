import { ApiProperty } from '@nestjs/swagger';

export class TotpSetupResponseDto {
  @ApiProperty({
    description: 'otpauth:// URI for rendering a QR code on the frontend',
    example: 'otpauth://totp/Vritti:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Vritti',
  })
  keyUri: string;

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
