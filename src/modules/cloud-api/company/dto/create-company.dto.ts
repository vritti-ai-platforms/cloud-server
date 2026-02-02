import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import {
  IndustryTypeValues,
  CompanySizeValues,
  DatabaseTypeValues,
  DatabaseRegionValues,
  type IndustryType,
  type CompanySize,
  type DatabaseType,
  type DatabaseRegion,
} from '@/db/schema';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Company display name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unique subdomain for the company',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiProperty({
    description: 'Industry type',
    enum: IndustryTypeValues,
    example: 'HEALTHCARE',
  })
  @IsEnum(IndustryTypeValues)
  industry: IndustryType;

  @ApiProperty({
    description: 'Company size',
    enum: CompanySizeValues,
    example: 'SIZE_11_50',
  })
  @IsEnum(CompanySizeValues)
  size: CompanySize;

  @ApiPropertyOptional({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    description: 'Database deployment type',
    enum: DatabaseTypeValues,
    example: 'SHARED',
  })
  @IsEnum(DatabaseTypeValues)
  dbType: DatabaseType;

  @ApiPropertyOptional({
    description: 'Database region (required for DEDICATED)',
    enum: DatabaseRegionValues,
    example: 'AP_SOUTH_1',
  })
  @IsEnum(DatabaseRegionValues)
  @IsOptional()
  dbRegion?: DatabaseRegion;

  @ApiPropertyOptional({
    description: 'App codes or IDs to enable on company creation',
    example: ['hrms', 'payroll'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  enabledAppIds?: string[];
}
