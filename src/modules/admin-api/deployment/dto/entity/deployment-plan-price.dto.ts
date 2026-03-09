import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeploymentPlanIndustryPriceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  industryId: string;

  @ApiProperty({ example: 'Healthcare' })
  industryName: string;

  @ApiPropertyOptional({ example: '2999.00', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ example: 'INR', nullable: true })
  currency: string | null;
}

export class DeploymentPlanPriceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  planId: string;

  @ApiProperty({ example: 'Free' })
  planName: string;

  @ApiProperty({ example: 'free' })
  planCode: string;

  @ApiProperty({ type: [DeploymentPlanIndustryPriceDto] })
  industries: DeploymentPlanIndustryPriceDto[];
}
