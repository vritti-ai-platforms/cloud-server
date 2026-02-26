import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Plan } from '@/db/schema';

export class PlanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Pro' })
  name: string;

  @ApiProperty({ example: 'pro' })
  code: string;

  @ApiPropertyOptional({ example: '$9/mo', nullable: true })
  price: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static from(plan: Plan): PlanDto {
    const dto = new PlanDto();
    dto.id = plan.id;
    dto.name = plan.name;
    dto.code = plan.code;
    dto.price = plan.price;
    dto.createdAt = plan.createdAt;
    dto.updatedAt = plan.updatedAt;
    return dto;
  }
}
