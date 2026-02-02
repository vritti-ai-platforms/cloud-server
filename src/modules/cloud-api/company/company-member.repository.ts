import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, and } from '@vritti/api-sdk/drizzle-orm';
import { companyMembers, memberRoles, type NewMemberRole } from '@/db/schema';

type CompanyMember = typeof companyMembers.$inferSelect;
type MemberRole = typeof memberRoles.$inferSelect;

@Injectable()
export class CompanyMemberRepository extends PrimaryBaseRepository<typeof companyMembers> {
  constructor(database: PrimaryDatabaseService) {
    super(database, companyMembers);
  }

  async findByCompanyId(companyId: string): Promise<CompanyMember[]> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findMany({
      where: { companyId },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findByUserId(userId: string): Promise<CompanyMember[]> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findByCompanyAndUser(companyId: string, userId: string): Promise<CompanyMember | undefined> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findFirst({
      where: { companyId, userId },
    });
  }

  async getMemberRoles(memberId: string): Promise<MemberRole[]> {
    return this.db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.companyMemberId, memberId));
  }

  async assignRole(
    memberId: string,
    roleId: string,
    assignedBy?: string,
  ): Promise<MemberRole> {
    const [result] = await this.db
      .insert(memberRoles)
      .values({
        companyMemberId: memberId,
        roleId,
        assignedBy,
      })
      .returning();
    return result;
  }

  async removeRole(memberId: string, roleId: string): Promise<void> {
    await this.db
      .delete(memberRoles)
      .where(
        and(
          eq(memberRoles.companyMemberId, memberId),
          eq(memberRoles.roleId, roleId),
        ),
      );
  }

  async setRoles(
    memberId: string,
    roleIds: string[],
    assignedBy?: string,
  ): Promise<void> {
    // Delete existing roles
    await this.db
      .delete(memberRoles)
      .where(eq(memberRoles.companyMemberId, memberId));

    // Insert new roles
    if (roleIds.length > 0) {
      const newRoles: NewMemberRole[] = roleIds.map((roleId) => ({
        companyMemberId: memberId,
        roleId,
        assignedBy,
      }));

      await this.db.insert(memberRoles).values(newRoles);
    }
  }
}
