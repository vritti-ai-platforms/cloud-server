import { ApiProperty } from '@nestjs/swagger';

export class AssignDeploymentPlanResponseDto {
  @ApiProperty({ example: 1, description: 'Number of assignments created (0 if duplicate)' })
  assigned: number;
}
