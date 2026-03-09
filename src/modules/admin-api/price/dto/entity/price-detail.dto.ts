import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface PriceWithRelations {
  id: string;
  planId: string;
  industryId: string;
  regionId: string;
  regionName: string | null;
  regionCode: string | null;
  providerId: string;
  providerName: string | null;
  providerCode: string | null;
  price: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class PriceDetailDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  planId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  industryId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  regionId: string;

  @ApiProperty({ example: 'Mumbai' })
  regionName: string;

  @ApiProperty({ example: 'ap-south-1' })
  regionCode: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  providerId: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  providerName: string;

  @ApiProperty({ example: 'AWS' })
  providerCode: string;

  @ApiProperty({ example: '99.99' })
  price: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static fromWithRelations(row: PriceWithRelations): PriceDetailDto {
    const dto = new PriceDetailDto();
    dto.id = row.id;
    dto.planId = row.planId;
    dto.industryId = row.industryId;
    dto.regionId = row.regionId;
    dto.regionName = row.regionName ?? '';
    dto.regionCode = row.regionCode ?? '';
    dto.providerId = row.providerId;
    dto.providerName = row.providerName ?? '';
    dto.providerCode = row.providerCode ?? '';
    dto.price = row.price;
    dto.currency = row.currency;
    dto.createdAt = row.createdAt;
    dto.updatedAt = row.updatedAt;
    return dto;
  }
}
