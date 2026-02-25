import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { organizationMembers, organizations } from '@/db/schema';
import type { Organization, OrganizationMember } from '@/db/schema';

@Injectable()
export class OrganizationMemberRepository extends PrimaryBaseRepository<typeof organizationMembers> {
  constructor(database: PrimaryDatabaseService) {
    super(database, organizationMembers);
  }

  // Returns all organizations (with data) that a user is a member of
  async findByUserId(userId: string): Promise<(OrganizationMember & { organization: Organization })[]> {
    const rows = await this.db
      .select({ member: organizationMembers, organization: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId));

    return rows.map((row) => ({ ...row.member, organization: row.organization }));
  }
}
