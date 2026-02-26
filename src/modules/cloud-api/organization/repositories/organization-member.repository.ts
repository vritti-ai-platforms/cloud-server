import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, getColumns } from '@vritti/api-sdk/drizzle-orm';
import type { Organization, OrganizationMember } from '@/db/schema';
import { organizationMembers, organizations } from '@/db/schema';

@Injectable()
export class OrganizationMemberRepository extends PrimaryBaseRepository<typeof organizationMembers> {
  constructor(database: PrimaryDatabaseService) {
    super(database, organizationMembers);
  }

  // Returns paginated member rows with org data and total membership count
  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ result: (OrganizationMember & { organization: Organization })[]; count: number }> {
    const where = eq(organizationMembers.userId, userId);

    const { result, count } = await this.findAllAndCount<OrganizationMember & { organization: Organization }>({
      select: { ...getColumns(organizationMembers), organization: organizations },
      leftJoin: { table: organizations, on: eq(organizationMembers.organizationId, organizations.id) },
      where,
      ...options,
    });

    return { result, count };
  }
}
