import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Price } from '@/db/schema';

export class PriceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  planId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  industryId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  regionId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  providerId: string;

  @ApiProperty({ example: '99.99' })
  price: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static from(price: Price): PriceDto {
    const dto = new PriceDto();
    dto.id = price.id;
    dto.planId = price.planId;
    dto.industryId = price.industryId;
    dto.regionId = price.regionId;
    dto.providerId = price.providerId;
    dto.price = price.price;
    dto.currency = price.currency;
    dto.createdAt = price.createdAt;
    dto.updatedAt = price.updatedAt;
    return dto;
  }
}
