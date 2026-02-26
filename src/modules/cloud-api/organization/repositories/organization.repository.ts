import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import type { Organization } from '@/db/schema';
import { organizations } from '@/db/schema';

@Injectable()
export class OrganizationRepository extends PrimaryBaseRepository<typeof organizations> {
  constructor(database: PrimaryDatabaseService) {
    super(database, organizations);
  }

  // Finds an organization by its subdomain
  async findBySubdomain(subdomain: string): Promise<Organization | undefined> {
    return this.model.findFirst({ where: { subdomain } });
  }

}
