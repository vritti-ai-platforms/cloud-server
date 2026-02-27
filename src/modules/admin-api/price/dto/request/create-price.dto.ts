import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString, IsUUID, Length } from 'class-validator';

export class CreatePriceDto {
  @ApiProperty({ description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Industry UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  industryId: string;

  @ApiProperty({ description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  regionId: string;

  @ApiProperty({ description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Price amount', example: '99.99' })
  @IsNumberString()
  price: string;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'INR' })
  @IsString()
  @Length(3, 3)
  currency: string;
}
