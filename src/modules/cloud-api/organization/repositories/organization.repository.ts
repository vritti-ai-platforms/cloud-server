import { Injectable } from '@nestjs/common';
import { type FindForSelectConfig, PrimaryBaseRepository, PrimaryDatabaseService, type SelectQueryResult } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import type { Organization } from '@/db/schema';
import { organizationMembers, organizations, plans } from '@/db/schema';

@Injectable()
export class OrganizationRepository extends PrimaryBaseRepository<typeof organizations> {
  constructor(database: PrimaryDatabaseService) {
    super(database, organizations);
  }

  // Finds an organization by its subdomain
  async findBySubdomain(subdomain: string): Promise<Organization | undefined> {
    return this.model.findFirst({ where: { subdomain } });
  }

  // Returns user's organizations as select options with plan code as description
  findForSelectByUser(
    userId: string,
    config: Omit<FindForSelectConfig, 'joins' | 'conditions'>,
  ): Promise<SelectQueryResult> {
    return this.findForSelect({
      ...config,
      joins: [
        { table: organizationMembers, on: eq(organizations.id, organizationMembers.organizationId) },
        { table: plans, on: eq(organizations.planId, plans.id) },
      ],
      conditions: [eq(organizationMembers.userId, userId)],
    });
  }
}
