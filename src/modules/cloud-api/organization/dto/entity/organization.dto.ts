import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Organization, OrgMemberRole, OrgSize } from '@/db/schema';

export class OrgListItemDto {
  @ApiProperty({
    description: 'Unique identifier of the organization',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Display name of the organization', example: 'Acme Corp' })
  name: string;

  @ApiProperty({ description: 'Unique subdomain for the organization', example: 'acme-corp' })
  subdomain: string;

  @ApiProperty({ description: 'Organization ID in api-nexus', example: '550e8400-e29b-41d4-a716-446655440001' })
  orgIdentifier: string;

  @ApiPropertyOptional({ description: 'Industry ID', example: '550e8400-e29b-41d4-a716-446655440002', nullable: true })
  industryId: string | null;

  @ApiProperty({
    description: 'Size of the organization',
    enum: ['0-10', '10-20', '20-50', '50-100', '100-500', '500+'],
    example: '0-10',
  })
  size: OrgSize;

  @ApiPropertyOptional({ description: 'Media asset ID for the organization logo', example: '550e8400-e29b-41d4-a716-446655440000', nullable: true })
  mediaId: string | null;

  @ApiPropertyOptional({ description: 'Plan ID', example: '550e8400-e29b-41d4-a716-446655440003', nullable: true })
  planId: string | null;

  @ApiPropertyOptional({ description: 'Deployment ID', example: '550e8400-e29b-41d4-a716-446655440004', nullable: true })
  deploymentId: string | null;

  @ApiProperty({
    description: "Authenticated user's role in this organization",
    enum: ['Owner', 'Admin'],
    example: 'Owner',
  })
  role: OrgMemberRole;

  @ApiProperty({ description: 'Timestamp when the organization was created', type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Timestamp when the organization was last updated', type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  constructor(partial: Partial<OrgListItemDto>) {
    Object.assign(this, partial);
  }

  static from(org: Organization, role: OrgMemberRole): OrgListItemDto {
    return new OrgListItemDto({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      orgIdentifier: org.orgIdentifier,
      industryId: org.industryId ?? null,
      size: org.size,
      mediaId: org.mediaId ?? null,
      planId: org.planId ?? null,
      deploymentId: org.deploymentId ?? null,
      role,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt ?? null,
    });
  }
}
