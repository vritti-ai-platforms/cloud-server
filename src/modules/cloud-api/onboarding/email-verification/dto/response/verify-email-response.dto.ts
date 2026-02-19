import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Indicates whether the email was verified successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Email verified successfully',
  })
  message: string;
}
