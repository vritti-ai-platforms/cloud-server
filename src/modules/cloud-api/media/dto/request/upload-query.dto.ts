import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadQueryDto {
  @ApiProperty({
    description: 'Entity type this media is associated with (e.g., "user", "tenant")',
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityType: string;

  @ApiProperty({
    description: 'Entity ID this media is associated with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityId: string;
}
