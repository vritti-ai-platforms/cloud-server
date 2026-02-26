import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Deployment } from '@/db/schema';

export class DeploymentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'US East Production' })
  name: string;

  @ApiProperty({ example: 'https://nexus-us-east.vritti.io' })
  nexusUrl: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  // Strips webhookSecret from the response for security
  static from(deployment: Deployment): DeploymentDto {
    const dto = new DeploymentDto();
    dto.id = deployment.id;
    dto.name = deployment.name;
    dto.nexusUrl = deployment.nexusUrl;
    dto.createdAt = deployment.createdAt;
    dto.updatedAt = deployment.updatedAt;
    return dto;
  }
}
