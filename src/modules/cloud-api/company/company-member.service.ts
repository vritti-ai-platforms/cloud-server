import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException, BadRequestException } from '@vritti/api-sdk';
import { CompanyMemberRepository } from './company-member.repository';
import { CompanyRepository } from './company.repository';
import { RoleRepository } from '../role/role.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CompanyMemberResponseDto } from './dto';
import type { CompanyMember } from '@/db/schema';

export interface AddMemberParams {
  companyId: string;
  userId: string;
  roleIds: string[];
  invitedBy?: string;
}

@Injectable()
export class CompanyMemberService {
  private readonly logger = new Logger(CompanyMemberService.name);

  constructor(
    private readonly companyMemberRepository: CompanyMemberRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly roleRepository: RoleRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async addMember(params: AddMemberParams, actorMemberId?: string): Promise<CompanyMemberResponseDto> {
    // Check if user is already a member
    const existing = await this.companyMemberRepository.findByCompanyAndUser(
      params.companyId,
      params.userId,
    );
    if (existing) {
      throw new ConflictException(
        'userId',
        'User is already a member of this company',
        'This user already belongs to this company.',
      );
    }

    // Create membership
    const member = await this.companyMemberRepository.create({
      companyId: params.companyId,
      userId: params.userId,
      status: 'ACTIVE',
      invitedBy: params.invitedBy,
    });

    // Assign roles
    if (params.roleIds.length > 0) {
      await this.companyMemberRepository.setRoles(member.id, params.roleIds, actorMemberId);

      // Update role user counts
      for (const roleId of params.roleIds) {
        await this.roleRepository.incrementUserCount(roleId);
      }
    }

    // Update company user count
    await this.companyRepository.incrementUsersCount(params.companyId);

    // Log activity
    await this.activityLogService.log({
      companyId: params.companyId,
      userId: params.userId,
      action: 'member.added',
      entityType: 'company_member',
      entityId: member.id,
    });

    this.logger.log(`Added user ${params.userId} to company ${params.companyId}`);

    return this.buildMemberResponse(member, params.roleIds);
  }

  async findByCompanyId(companyId: string): Promise<CompanyMemberResponseDto[]> {
    const members = await this.companyMemberRepository.findByCompanyId(companyId);

    const results = await Promise.all(
      members.map(async (member) => {
        const roles = await this.companyMemberRepository.getMemberRoles(member.id);
        return this.buildMemberResponse(member, roles.map((r) => r.roleId));
      }),
    );

    return results;
  }

  async findByUserId(userId: string): Promise<CompanyMemberResponseDto[]> {
    const members = await this.companyMemberRepository.findByUserId(userId);

    const results = await Promise.all(
      members.map(async (member) => {
        const roles = await this.companyMemberRepository.getMemberRoles(member.id);
        return this.buildMemberResponse(member, roles.map((r) => r.roleId));
      }),
    );

    return results;
  }

  async findById(id: string): Promise<CompanyMemberResponseDto> {
    const member = await this.companyMemberRepository.findById(id);
    if (!member) {
      throw new NotFoundException(
        `Member with ID '${id}' not found`,
        'The member may have been removed from the company.',
      );
    }

    const roles = await this.companyMemberRepository.getMemberRoles(id);
    return this.buildMemberResponse(member, roles.map((r) => r.roleId));
  }

  async removeMember(id: string, actorUserId?: string): Promise<void> {
    const member = await this.companyMemberRepository.findById(id);
    if (!member) {
      throw new NotFoundException(
        `Member with ID '${id}' not found`,
        'The member may have already been removed.',
      );
    }

    // Get current roles to decrement counts
    const roles = await this.companyMemberRepository.getMemberRoles(id);

    // Delete member (cascades to member_roles)
    await this.companyMemberRepository.delete(id);

    // Update role user counts
    for (const role of roles) {
      await this.roleRepository.decrementUserCount(role.roleId);
    }

    // Update company user count
    await this.companyRepository.decrementUsersCount(member.companyId);

    // Log activity
    await this.activityLogService.log({
      companyId: member.companyId,
      userId: actorUserId,
      action: 'member.removed',
      entityType: 'company_member',
      entityId: id,
      metadata: { removedUserId: member.userId },
    });

    this.logger.log(`Removed member ${id} from company ${member.companyId}`);
  }

  async assignRole(
    memberId: string,
    roleId: string,
    actorMemberId?: string,
  ): Promise<void> {
    const member = await this.companyMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException(
        `Member with ID '${memberId}' not found`,
        'The member may have been removed.',
      );
    }

    // Check if role already assigned
    const existingRoles = await this.companyMemberRepository.getMemberRoles(memberId);
    if (existingRoles.some((r) => r.roleId === roleId)) {
      throw new ConflictException(
        'roleId',
        'Role is already assigned to this member',
        'This role is already assigned.',
      );
    }

    await this.companyMemberRepository.assignRole(memberId, roleId, actorMemberId);
    await this.roleRepository.incrementUserCount(roleId);

    // Log activity
    await this.activityLogService.log({
      companyId: member.companyId,
      action: 'member.role_assigned',
      entityType: 'company_member',
      entityId: memberId,
      metadata: { roleId },
    });

    this.logger.log(`Assigned role ${roleId} to member ${memberId}`);
  }

  async removeRole(
    memberId: string,
    roleId: string,
    actorUserId?: string,
  ): Promise<void> {
    const member = await this.companyMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException(
        `Member with ID '${memberId}' not found`,
        'The member may have been removed.',
      );
    }

    // Check if role is assigned
    const existingRoles = await this.companyMemberRepository.getMemberRoles(memberId);
    if (!existingRoles.some((r) => r.roleId === roleId)) {
      throw new BadRequestException(
        'roleId',
        'Role is not assigned to this member',
        'This role is not currently assigned to the member.',
      );
    }

    // Prevent removing last role
    if (existingRoles.length === 1) {
      throw new BadRequestException(
        'roleId',
        'Cannot remove the last role from a member',
        'Members must have at least one role assigned.',
      );
    }

    await this.companyMemberRepository.removeRole(memberId, roleId);
    await this.roleRepository.decrementUserCount(roleId);

    // Log activity
    await this.activityLogService.log({
      companyId: member.companyId,
      userId: actorUserId,
      action: 'member.role_removed',
      entityType: 'company_member',
      entityId: memberId,
      metadata: { roleId },
    });

    this.logger.log(`Removed role ${roleId} from member ${memberId}`);
  }

  private buildMemberResponse(
    member: CompanyMember,
    roleIds: string[],
  ): CompanyMemberResponseDto {
    return new CompanyMemberResponseDto({
      id: member.id,
      companyId: member.companyId,
      userId: member.userId,
      status: member.status,
      joinedAt: member.joinedAt,
      invitedBy: member.invitedBy,
      roleIds,
      createdAt: member.createdAt,
    });
  }
}
