import { ApiPropertyOptional } from '@nestjs/swagger';
import { SelectOptionsQueryDto } from '@vritti/api-sdk';
import { IsOptional, IsUUID } from 'class-validator';

export class CloudProviderSelectQueryDto extends SelectOptionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by region ID' })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
