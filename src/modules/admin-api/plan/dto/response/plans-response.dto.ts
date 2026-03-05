import { ApiProperty } from '@nestjs/swagger';
import { PlanDto } from '../entity/plan.dto';

export class PlansResponseDto {
  @ApiProperty({ type: [PlanDto] })
  result: PlanDto[];

  @ApiProperty()
  count: number;
}
