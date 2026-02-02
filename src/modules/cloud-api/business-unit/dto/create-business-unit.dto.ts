import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';
import { BusinessUnitTypeValues, type BusinessUnitType } from '@/db/schema';

export class CreateBusinessUnitDto {
  @ApiProperty({
    description: 'Business unit name',
    example: 'Downtown Clinic',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Short code',
    example: 'DTC-01',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiProperty({
    description: 'Business unit type',
    enum: BusinessUnitTypeValues,
    example: 'CLINIC',
  })
  @IsEnum(BusinessUnitTypeValues)
  type: BusinessUnitType;

  @ApiPropertyOptional({
    description: 'Description',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Manager (company member ID)' })
  @IsUUID('4')
  @IsOptional()
  managerId?: string;
}
