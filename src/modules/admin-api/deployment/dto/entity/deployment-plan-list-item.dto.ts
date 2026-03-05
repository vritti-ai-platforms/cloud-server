import { ApiProperty } from '@nestjs/swagger';

export class DeploymentPlanListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  planId: string;

  @ApiProperty({ example: 'Free' })
  planName: string;

  @ApiProperty({ example: 'free' })
  planCode: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  industryId: string;

  @ApiProperty({ example: 'Healthcare' })
  industryName: string;
}
