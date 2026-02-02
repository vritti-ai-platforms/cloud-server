import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException } from '@vritti/api-sdk';
import { RoleRepository } from './role.repository';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  PERMISSIONS,
  OWNER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  MANAGER_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  isValidPermissionCode,
} from '@/constants/permissions';
import type { Role, RolePermission } from '@/db/schema';

interface DefaultRoleConfig {
  name: string;
  description: string;
  color: string;
  icon: string;
  permissions: string[];
}

const DEFAULT_ROLES: DefaultRoleConfig[] = [
  {
    name: 'Owner',
    description: 'Full access to all company features',
    color: '#DC2626',
    icon: 'crown',
    permissions: OWNER_PERMISSIONS,
  },
  {
    name: 'Admin',
    description: 'Administrative access with some restrictions',
    color: '#2563EB',
    icon: 'shield',
    permissions: ADMIN_PERMISSIONS,
  },
  {
    name: 'Manager',
    description: 'Team management and operational access',
    color: '#059669',
    icon: 'users',
    permissions: MANAGER_PERMISSIONS,
  },
  {
    name: 'Employee',
    description: 'Basic access to view company information',
    color: '#6B7280',
    icon: 'user',
    permissions: EMPLOYEE_PERMISSIONS,
  },
];

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async createDefaultRoles(companyId: string): Promise<RoleResponseDto[]> {
    const createdRoles: RoleResponseDto[] = [];

    for (const config of DEFAULT_ROLES) {
      const role = await this.roleRepository.create({
        companyId,
        name: config.name,
        description: config.description,
        color: config.color,
        icon: config.icon,
        isSystem: true,
      });

      await this.roleRepository.setPermissions(role.id, config.permissions);

      const permissions = await this.roleRepository.getPermissions(role.id);
      createdRoles.push(RoleResponseDto.from(role, permissions));
    }

    this.logger.log(`Created ${createdRoles.length} default roles for company ${companyId}`);
    return createdRoles;
  }

  async create(
    companyId: string,
    dto: CreateRoleDto,
    actorUserId?: string,
  ): Promise<RoleResponseDto> {
    // Validate permission codes
    const invalidCodes = dto.permissionCodes.filter((code) => !isValidPermissionCode(code));
    if (invalidCodes.length > 0) {
      throw new BadRequestException(
        'permissionCodes',
        `Invalid permission codes: ${invalidCodes.join(', ')}`,
        'Some permission codes are not recognized. Please check the available permissions.',
      );
    }

    // Check for duplicate name
    const existing = await this.roleRepository.findByName(companyId, dto.name);
    if (existing) {
      throw new ConflictException(
        'name',
        `Role with name '${dto.name}' already exists in this company`,
        'Please choose a different name for the role.',
      );
    }

    // Create role
    let role: Role;
    try {
      role = await this.roleRepository.create({
        companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        isSystem: false,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Error & { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'name',
          `Role with name '${dto.name}' already exists`,
          'Please choose a different name.',
        );
      }
      throw error;
    }

    // Set permissions
    await this.roleRepository.setPermissions(role.id, dto.permissionCodes);

    // Log activity
    await this.activityLogService.log({
      companyId,
      userId: actorUserId,
      action: 'role.created',
      entityType: 'role',
      entityId: role.id,
      metadata: { name: role.name, permissionCount: dto.permissionCodes.length },
    });

    const permissions = await this.roleRepository.getPermissions(role.id);
    this.logger.log(`Created role '${role.name}' in company ${companyId}`);

    return RoleResponseDto.from(role, permissions);
  }

  async findAll(companyId: string): Promise<RoleResponseDto[]> {
    const rolesWithPermissions = await this.roleRepository.findByCompanyIdWithPermissions(companyId);
    return rolesWithPermissions.map(({ role, permissions }) =>
      RoleResponseDto.from(role, permissions),
    );
  }

  async findById(id: string): Promise<RoleResponseDto> {
    const result = await this.roleRepository.findByIdWithPermissions(id);
    if (!result) {
      throw new NotFoundException(
        `Role with ID '${id}' not found`,
        'The role may have been deleted or does not exist.',
      );
    }
    return RoleResponseDto.from(result.role, result.permissions);
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorUserId?: string,
  ): Promise<RoleResponseDto> {
    const existing = await this.roleRepository.findByIdWithPermissions(id);
    if (!existing) {
      throw new NotFoundException(
        `Role with ID '${id}' not found`,
        'The role may have been deleted.',
      );
    }

    // Prevent editing system role names
    if (existing.role.isSystem && dto.name && dto.name !== existing.role.name) {
      throw new BadRequestException(
        'name',
        'Cannot rename system roles',
        'System roles (Owner, Admin, Manager, Employee) cannot be renamed.',
      );
    }

    // Validate permission codes if provided
    if (dto.permissionCodes) {
      const invalidCodes = dto.permissionCodes.filter((code) => !isValidPermissionCode(code));
      if (invalidCodes.length > 0) {
        throw new BadRequestException(
          'permissionCodes',
          `Invalid permission codes: ${invalidCodes.join(', ')}`,
          'Some permission codes are not recognized.',
        );
      }
    }

    // Check for duplicate name
    if (dto.name && dto.name !== existing.role.name) {
      const duplicate = await this.roleRepository.findByName(existing.role.companyId, dto.name);
      if (duplicate) {
        throw new ConflictException(
          'name',
          `Role with name '${dto.name}' already exists`,
          'Please choose a different name.',
        );
      }
    }

    // Update role
    const updateData: Partial<Role> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    let role = existing.role;
    if (Object.keys(updateData).length > 0) {
      role = await this.roleRepository.update(id, updateData);
    }

    // Update permissions if provided
    if (dto.permissionCodes) {
      await this.roleRepository.setPermissions(id, dto.permissionCodes);
    }

    // Log activity
    await this.activityLogService.log({
      companyId: role.companyId,
      userId: actorUserId,
      action: 'role.updated',
      entityType: 'role',
      entityId: role.id,
      changes: dto as Record<string, unknown>,
    });

    const permissions = await this.roleRepository.getPermissions(id);
    this.logger.log(`Updated role '${role.name}'`);

    return RoleResponseDto.from(role, permissions);
  }

  async delete(id: string, actorUserId?: string): Promise<void> {
    const existing = await this.roleRepository.findByIdWithPermissions(id);
    if (!existing) {
      throw new NotFoundException(
        `Role with ID '${id}' not found`,
        'The role may have already been deleted.',
      );
    }

    if (existing.role.isSystem) {
      throw new BadRequestException(
        'id',
        'Cannot delete system roles',
        'System roles (Owner, Admin, Manager, Employee) cannot be deleted.',
      );
    }

    if (existing.role.userCount > 0) {
      throw new BadRequestException(
        'id',
        `Cannot delete role with ${existing.role.userCount} assigned users`,
        'Please remove all users from this role before deleting it.',
      );
    }

    await this.roleRepository.delete(id);

    // Log activity
    await this.activityLogService.log({
      companyId: existing.role.companyId,
      userId: actorUserId,
      action: 'role.deleted',
      entityType: 'role',
      entityId: id,
      metadata: { name: existing.role.name },
    });

    this.logger.log(`Deleted role '${existing.role.name}'`);
  }

  async getOwnerRole(companyId: string): Promise<Role | undefined> {
    return this.roleRepository.findByName(companyId, 'Owner');
  }

  // Get all available permissions (static catalog)
  getAvailablePermissions() {
    return Object.entries(PERMISSIONS).map(([code, def]) => ({
      code,
      ...def,
    }));
  }
}
