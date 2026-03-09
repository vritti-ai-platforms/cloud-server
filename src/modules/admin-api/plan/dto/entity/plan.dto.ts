import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Plan } from '@/db/schema';

export class PlanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Pro' })
  name: string;

  @ApiProperty({ example: 'pro' })
  code: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: 2 })
  priceCount: number;

  @ApiProperty({ example: true })
  canDelete: boolean;

  static from(plan: Plan, priceCount = 0, canDelete = true): PlanDto {
    const dto = new PlanDto();
    dto.id = plan.id;
    dto.name = plan.name;
    dto.code = plan.code;
    dto.createdAt = plan.createdAt;
    dto.updatedAt = plan.updatedAt;
    dto.priceCount = priceCount;
    dto.canDelete = canDelete;
    return dto;
  }
}
