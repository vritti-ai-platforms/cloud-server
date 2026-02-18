import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateInstagramInboxDto {
  @ApiProperty({
    description: 'Display name for the Instagram inbox',
    example: 'My Instagram Page',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Instagram Graph API access token',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'Facebook Page ID linked to the Instagram account',
  })
  @IsString()
  @IsNotEmpty()
  pageId: string;
}
