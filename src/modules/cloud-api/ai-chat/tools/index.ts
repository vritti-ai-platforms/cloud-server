import type { PrimaryDatabaseService } from '@vritti/api-sdk';
import type { TenantService } from '../../tenant/tenant.service';
import { createTenantTools } from './tenant.tools';
import { createCompanyTools } from './company.tools';

export interface ToolDependencies {
  tenantService: TenantService;
  db: PrimaryDatabaseService;
}

export function createAllTools(deps: ToolDependencies) {
  return {
    ...createTenantTools(deps.tenantService),
    ...createCompanyTools(deps.db),
  };
}

export type AllTools = ReturnType<typeof createAllTools>;
