import { tool } from 'ai';
import { z } from 'zod';
import type { TenantService } from '../../tenant/tenant.service';

export function createTenantTools(tenantService: TenantService) {
  return {
    list_tenants: tool({
      description: 'List all tenants in the system. Returns tenant ID, name, subdomain, status, and database type.',
      inputSchema: z.object({}),
      execute: async () => {
        const tenants = await tenantService.findAll();
        return {
          success: true,
          count: tenants.length,
          tenants: tenants.map((t) => ({
            id: t.id,
            name: t.name,
            subdomain: t.subdomain,
            status: t.status,
            dbType: t.dbType,
            createdAt: t.createdAt,
          })),
        };
      },
    }),

    get_tenant: tool({
      description: 'Get detailed information about a specific tenant by ID or subdomain.',
      inputSchema: z.object({
        identifier: z.string().describe('The tenant ID (UUID) or subdomain'),
        identifierType: z.enum(['id', 'subdomain']).describe('Type of identifier provided'),
      }),
      execute: async ({ identifier, identifierType }) => {
        try {
          const tenant =
            identifierType === 'id'
              ? await tenantService.findById(identifier)
              : await tenantService.findBySubdomain(identifier);

          return {
            success: true,
            tenant: {
              id: tenant.id,
              name: tenant.name,
              subdomain: tenant.subdomain,
              description: tenant.description,
              status: tenant.status,
              dbType: tenant.dbType,
              createdAt: tenant.createdAt,
              updatedAt: tenant.updatedAt,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Tenant not found',
          };
        }
      },
    }),
  };
}
