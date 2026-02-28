import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignDeploymentPlanDto {
  @ApiProperty({ description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Industry UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  industryId: string;
}
