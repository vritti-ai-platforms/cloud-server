import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import type { OrgSize } from '@/db/schema';
import { OrgSizeValues } from '@/db/schema';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Display name of the organization', example: 'Acme Corp' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Unique subdomain for the organization. Lowercase letters, numbers, and hyphens only.',
    example: 'acme-corp',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, and hyphens' })
  subdomain: string;

  @ApiProperty({
    description: 'Size of the organization',
    enum: ['0-10', '10-20', '20-50', '50-100', '100-500', '500+'],
    example: '0-10',
  })
  @IsEnum(OrgSizeValues)
  size: OrgSize;

  @ApiPropertyOptional({ description: 'Plan ID for the organization', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Industry ID for the organization', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  industryId?: string;

  @ApiPropertyOptional({ description: 'Deployment ID for the organization', example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID()
  deploymentId?: string;

  @ApiPropertyOptional({ description: 'Media asset ID for the organization logo', example: 'media-uuid-here' })
  @IsOptional()
  @IsString()
  mediaId?: string;
}
