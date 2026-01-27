import { tool } from 'ai';
import { z } from 'zod';
import type { PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { companies, businessUnits } from '@/db/schema';

export function createCompanyTools(database: PrimaryDatabaseService) {
  // @ts-ignore - Accessing db from PrimaryDatabaseService
  const db = database.db;

  return {
    list_companies: tool({
      description: 'List all companies with their industry, size, and statistics.',
      parameters: z.object({}),
      // @ts-ignore - AI SDK tool type inference issue
      execute: async (): Promise<any> => {
        const results = await db.select().from(companies).orderBy(companies.createdAt);
        return {
          success: true,
          count: results.length,
          companies: results.map((c) => ({
            id: c.id,
            tenantId: c.tenantId,
            industry: c.industry,
            size: c.size,
            timezone: c.timezone,
            currency: c.currency,
            usersCount: c.usersCount,
            businessUnitsCount: c.businessUnitsCount,
            createdAt: c.createdAt,
          })),
        };
      },
    }),

    list_business_units: tool({
      description: 'List all business units for a company.',
      parameters: z.object({
        companyId: z.string().uuid().describe('The company ID'),
      }),
      // @ts-ignore - AI SDK tool type inference issue
      execute: async ({ companyId }): Promise<any> => {
        const results = await db
          .select()
          .from(businessUnits)
          .where(eq(businessUnits.companyId, companyId))
          .orderBy(businessUnits.createdAt);

        return {
          success: true,
          count: results.length,
          businessUnits: results.map((bu) => ({
            id: bu.id,
            name: bu.name,
            code: bu.code,
            status: bu.status,
            city: bu.city,
            state: bu.state,
            employeesCount: bu.employeesCount,
            createdAt: bu.createdAt,
          })),
        };
      },
    }),

    get_business_unit: tool({
      description: 'Get detailed information about a specific business unit.',
      parameters: z.object({
        businessUnitId: z.string().uuid().describe('The business unit ID'),
      }),
      // @ts-ignore - AI SDK tool type inference issue
      execute: async ({ businessUnitId }): Promise<any> => {
        const [bu] = await db
          .select()
          .from(businessUnits)
          .where(eq(businessUnits.id, businessUnitId));

        if (!bu) {
          return { success: false, error: 'Business unit not found' };
        }

        return {
          success: true,
          businessUnit: {
            id: bu.id,
            companyId: bu.companyId,
            name: bu.name,
            code: bu.code,
            description: bu.description,
            status: bu.status,
            phone: bu.phone,
            email: bu.email,
            address: {
              line1: bu.addressLine1,
              line2: bu.addressLine2,
              city: bu.city,
              state: bu.state,
              postalCode: bu.postalCode,
              country: bu.country,
            },
            employeesCount: bu.employeesCount,
            enabledAppsCount: bu.enabledAppsCount,
            createdAt: bu.createdAt,
            updatedAt: bu.updatedAt,
          },
        };
      },
    }),
  };
}
