import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Role name',
    example: 'Sales Manager',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manages the sales team and has access to CRM',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Hex color code for the role badge',
    example: '#2563EB',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g., #2563EB)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Lucide icon name for the role',
    example: 'shield',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Permission codes to assign to this role (replaces existing)',
    example: ['users.view', 'users.create', 'business_units.view'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  permissionCodes?: string[];
}
