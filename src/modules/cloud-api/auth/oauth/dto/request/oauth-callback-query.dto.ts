import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthCallbackQueryDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsNotEmpty()
  state: string;

  // OAuth error params (when user cancels or provider error occurs)
  @ApiProperty({ description: 'Error code from OAuth provider', required: false })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({ description: 'Error description from OAuth provider', required: false })
  @IsOptional()
  @IsString()
  error_description?: string;

  @ApiProperty({ description: 'Error code from OAuth provider (Facebook)', required: false })
  @IsOptional()
  @IsString()
  error_code?: string;

  @ApiProperty({ description: 'Error reason from OAuth provider (Facebook)', required: false })
  @IsOptional()
  @IsString()
  error_reason?: string;

  // Optional extra params that OAuth providers may include
  @ApiProperty({ description: 'OAuth scope parameter', required: false })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({ description: 'Authenticated user index (Google)', required: false })
  @IsOptional()
  @IsString()
  authuser?: string;

  @ApiProperty({ description: 'Hosted domain (Google Workspace)', required: false })
  @IsOptional()
  @IsString()
  hd?: string;

  @ApiProperty({ description: 'Prompt parameter from OAuth provider', required: false })
  @IsOptional()
  @IsString()
  prompt?: string;
}
