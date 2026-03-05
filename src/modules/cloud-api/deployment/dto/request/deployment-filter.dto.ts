import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DeploymentFilterDto {
  @ApiProperty({ description: 'Region UUID to filter deployments', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  regionId: string;

  @ApiProperty({ description: 'Cloud provider UUID to filter deployments', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  cloudProviderId: string;

  @ApiProperty({ description: 'Industry UUID to filter deployments', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  industryId: string;
}

export class DeploymentPlanQueryDto {
  @ApiPropertyOptional({ description: 'Industry UUID to filter plans', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  industryId?: string;
}
