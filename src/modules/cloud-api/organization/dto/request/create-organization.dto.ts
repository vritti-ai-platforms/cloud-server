import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { OrgPlan, OrgSize } from '@/db/schema';
import { OrgPlanValues, OrgSizeValues } from '@/db/schema';

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

  @ApiProperty({ description: 'Unique identifier for the organization', example: 'acme' })
  @IsString()
  @MinLength(1)
  orgIdentifier: string;

  @ApiProperty({
    description: 'Size of the organization',
    enum: ['0-10', '10-20', '20-50', '50-100', '100-500', '500+'],
    example: '0-10',
  })
  @IsEnum(OrgSizeValues)
  size: OrgSize;

  @ApiPropertyOptional({
    description: 'Subscription plan for the organization',
    enum: ['free', 'pro', 'enterprise'],
    example: 'free',
    default: 'free',
  })
  @IsOptional()
  @IsEnum(OrgPlanValues)
  plan?: OrgPlan;

  @ApiPropertyOptional({ description: 'Industry ID for the organization', example: 1 })
  @IsOptional()
  @IsInt()
  industryId?: number;
}
