import { ApiProperty } from '@nestjs/swagger';

class DeploymentSelectOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  value: string;

  @ApiProperty({ example: 'Production' })
  label: string;
}

export class DeploymentSelectResponseDto {
  @ApiProperty({ type: [DeploymentSelectOptionDto] })
  options: DeploymentSelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
