import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadQueryDto {
  @ApiPropertyOptional({
    description: 'Entity type this media is associated with (e.g., "user", "tenant")',
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityType: string;

  @ApiPropertyOptional({
    description: 'Entity ID this media is associated with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityId: string;

  @ApiPropertyOptional({
    description: 'Sub-entity type for finer categorization',
    example: 'avatar',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subEntityType?: string;
}
