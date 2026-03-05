import { ApiProperty } from '@nestjs/swagger';
import type { DeploymentType } from '@/db/schema';
import { DeploymentTypeValues } from '@/db/schema';

export class DeploymentOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'US East Production' })
  name: string;

  @ApiProperty({ enum: DeploymentTypeValues })
  type: DeploymentType;
}
