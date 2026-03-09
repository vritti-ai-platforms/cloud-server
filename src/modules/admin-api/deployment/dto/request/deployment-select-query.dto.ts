import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SelectOptionsQueryDto } from '@vritti/api-sdk';

export class DeploymentSelectQueryDto extends SelectOptionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by region ID' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Filter by cloud provider ID' })
  @IsOptional()
  @IsUUID()
  cloudProviderId?: string;
}
