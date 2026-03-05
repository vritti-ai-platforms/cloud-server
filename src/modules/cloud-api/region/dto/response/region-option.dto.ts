import { ApiProperty } from '@nestjs/swagger';

export class RegionOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'US East' })
  name: string;

  @ApiProperty({ example: 'us-east' })
  code: string;

  @ApiProperty({ example: 'Maharashtra' })
  state: string;

  @ApiProperty({ example: 'Mumbai' })
  city: string;
}
