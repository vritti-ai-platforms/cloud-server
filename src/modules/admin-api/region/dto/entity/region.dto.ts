import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Region } from '@/db/schema';

class RegionProviderItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoDarkUrl: string | null;

  @ApiProperty()
  isAssigned: boolean;

  @ApiProperty()
  deploymentCount: number;
}

export class RegionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Hyderabad Metro' })
  name: string;

  @ApiProperty({ example: 'hyd-metro' })
  code: string;

  @ApiProperty({ example: 'India' })
  country: string;

  @ApiProperty({ example: 'Telangana' })
  state: string;

  @ApiProperty({ example: 'Hyderabad' })
  city: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: 5 })
  providerCount: number;

  @ApiProperty({ type: [RegionProviderItem] })
  providers: RegionProviderItem[];

  @ApiProperty({ example: 3 })
  deploymentCount: number;

  @ApiProperty({ example: 12 })
  priceCount: number;

  @ApiProperty({ example: true })
  canDelete: boolean;

  static from(
    region: Region,
    providerCount = 0,
    providers: RegionProviderItem[] = [],
    deploymentCount = 0,
    priceCount = 0,
  ): RegionDto {
    const dto = new RegionDto();
    dto.id = region.id;
    dto.name = region.name;
    dto.code = region.code;
    dto.country = region.country;
    dto.state = region.state;
    dto.city = region.city;
    dto.isActive = region.isActive;
    dto.createdAt = region.createdAt;
    dto.updatedAt = region.updatedAt;
    dto.providerCount = providerCount;
    dto.providers = providers;
    dto.deploymentCount = deploymentCount;
    dto.priceCount = priceCount;
    dto.canDelete = deploymentCount === 0 && priceCount === 0;
    return dto;
  }
}
