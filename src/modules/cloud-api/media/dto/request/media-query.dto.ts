import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MediaQueryDto {
  @ApiProperty({
    description: 'Entity type to filter media by',
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityType: string;

  @ApiProperty({
    description: 'Entity ID to filter media by',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityId: string;
}
