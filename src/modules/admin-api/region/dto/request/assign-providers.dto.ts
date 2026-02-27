import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignProvidersDto {
  @ApiProperty({ type: [String], description: 'Array of provider UUIDs to assign', example: ['550e8400-e29b-41d4-a716-446655440000'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  providerIds: string[];
}
