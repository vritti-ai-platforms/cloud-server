import { ApiProperty } from '@nestjs/swagger';

class CloudProviderSelectOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  value: string;

  @ApiProperty({ example: 'AWS' })
  label: string;
}

export class CloudProviderSelectResponseDto {
  @ApiProperty({ type: [CloudProviderSelectOptionDto] })
  options: CloudProviderSelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
