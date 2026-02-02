import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Role, RolePermission } from '@/db/schema';

export class RoleResponseDto {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Company ID this role belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  companyId: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Sales Manager',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manages the sales team',
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Hex color code',
    example: '#2563EB',
  })
  color: string | null;

  @ApiPropertyOptional({
    description: 'Lucide icon name',
    example: 'shield',
  })
  icon: string | null;

  @ApiProperty({
    description: 'Whether this is a system role (cannot be deleted)',
    example: false,
  })
  isSystem: boolean;

  @ApiProperty({
    description: 'Number of users with this role',
    example: 5,
  })
  userCount: number;

  @ApiProperty({
    description: 'Permission codes assigned to this role',
    example: ['users.view', 'users.create'],
    type: [String],
  })
  permissionCodes: string[];

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
  })
  updatedAt: Date;

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }

  static from(
    role: Role,
    permissions: RolePermission[] = [],
  ): RoleResponseDto {
    return new RoleResponseDto({
      id: role.id,
      companyId: role.companyId,
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      isSystem: role.isSystem,
      userCount: role.userCount,
      permissionCodes: permissions.map((p) => p.permissionCode),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  }
}
