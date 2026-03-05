import { ApiProperty } from '@nestjs/swagger';
import { DeploymentDto } from '../entity/deployment.dto';

export class DeploymentsResponseDto {
  @ApiProperty({ type: [DeploymentDto] })
  result: DeploymentDto[];

  @ApiProperty()
  count: number;
}
