import { ApiProperty } from '@nestjs/swagger';

export class ResendEmailOtpResponseDto {
  @ApiProperty({
    description: 'Indicates whether the OTP was resent successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'OTP sent successfully',
  })
  message: string;
}
