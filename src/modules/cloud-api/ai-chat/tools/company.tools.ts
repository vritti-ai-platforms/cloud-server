import { tool } from 'ai';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import type { PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';
import { businessUnits, companies } from '@/db/schema';

const logger = new Logger('CompanyTools');

export function createCompanyTools(database: PrimaryDatabaseService) {
  logger.log('createCompanyTools called');
  return {
    list_companies: tool({
      description: 'List all companies with their industry, size, and statistics.',
      inputSchema: z.object({}),
      execute: async () => {
        logger.log('list_companies: Starting execution');
        try {
          const db = database.drizzleClient;
          logger.debug(`list_companies: Got drizzle client, query keys: ${Object.keys(db.query || {}).join(', ')}`);

          // Access query API - cast to any since TypeScript doesn't know the schema
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = db.query as any;
          if (!query?.companies) {
            const error = 'Database query.companies is not available';
            logger.error(`list_companies: ${error}`);
            throw new Error(error);
          }

          const results = await query.companies.findMany({
            orderBy: { createdAt: 'asc' },
          });
          logger.log(`list_companies: Found ${results?.length || 0} companies`);

          return {
            success: true,
            count: results.length,
            companies: results.map((c: Record<string, unknown>) => ({
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
        } catch (error) {
          logger.error(`list_companies: Failed - ${error}`);
          throw error; // Let AI SDK handle error properly
        }
      },
    }),

    list_business_units: tool({
      description: 'List all business units for a company.',
      inputSchema: z.object({
        companyId: z.string().uuid().describe('The company ID'),
      }),
      execute: async ({ companyId }) => {
        logger.log(`list_business_units: Starting for company ${companyId}`);
        try {
          const db = database.drizzleClient;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = db.query as any;

          if (!query?.businessUnits) {
            throw new Error('Database query.businessUnits is not available');
          }

          const results = await query.businessUnits.findMany({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (bu: any, { eq }: any) => eq(bu.companyId, companyId),
            orderBy: { createdAt: 'asc' },
          });
          logger.log(`list_business_units: Found ${results?.length || 0} business units`);

          return {
            success: true,
            count: results.length,
            businessUnits: results.map((bu: Record<string, unknown>) => ({
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
        } catch (error) {
          logger.error(`list_business_units: Failed - ${error}`);
          throw error;
        }
      },
    }),

    get_business_unit: tool({
      description: 'Get detailed information about a specific business unit.',
      inputSchema: z.object({
        businessUnitId: z.string().uuid().describe('The business unit ID'),
      }),
      execute: async ({ businessUnitId }) => {
        logger.log(`get_business_unit: Starting for ${businessUnitId}`);
        try {
          const db = database.drizzleClient;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = db.query as any;

          if (!query?.businessUnits) {
            throw new Error('Database query.businessUnits is not available');
          }

          const bu = await query.businessUnits.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (bu: any, { eq }: any) => eq(bu.id, businessUnitId),
          });

          if (!bu) {
            return { success: false, error: 'Business unit not found' };
          }

          logger.log(`get_business_unit: Found business unit ${bu.name}`);
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
        } catch (error) {
          logger.error(`get_business_unit: Failed - ${error}`);
          throw error;
        }
      },
    }),

    preview_create_company: tool({
      description:
        'Preview company creation. Shows what will be created before actual creation. Use this first, then confirm_create_company after user confirms.',
      inputSchema: z.object({
        tenantId: z.string().uuid().describe('The tenant ID to create the company for'),
        industry: z
          .enum(['TECHNOLOGY', 'MANUFACTURING', 'PROFESSIONAL_SERVICES', 'HEALTHCARE'])
          .describe('Industry type'),
        size: z.enum(['SIZE_11_50', 'SIZE_51_200', 'SIZE_200_PLUS']).describe('Company size'),
        timezone: z.string().default('Asia/Kolkata').optional().describe('Timezone (default: Asia/Kolkata)'),
        currency: z.string().default('INR').optional().describe('Currency code (default: INR)'),
      }),
      execute: async ({ tenantId, industry, size, timezone, currency }) => {
        logger.log(`preview_create_company: Previewing company for tenant ${tenantId}`);
        try {
          const db = database.drizzleClient;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = db.query as any;

          // Validate tenant exists
          const tenant = await query.tenants?.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (t: any, { eq }: any) => eq(t.id, tenantId),
          });
          if (!tenant) {
            return { success: false, error: 'Tenant not found', code: 'INVALID_TENANT' };
          }

          // Check if company already exists for this tenant
          const existing = await query.companies?.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (c: any, { eq }: any) => eq(c.tenantId, tenantId),
          });
          if (existing) {
            return {
              success: false,
              error: 'Company already exists for this tenant',
              code: 'DUPLICATE',
              existingCompany: { id: existing.id, industry: existing.industry },
            };
          }

          return {
            success: true,
            requiresConfirmation: true,
            preview: {
              tenantId,
              tenantName: tenant.name,
              industry,
              size,
              timezone: timezone || 'Asia/Kolkata',
              currency: currency || 'INR',
            },
            message: `Ready to create company for tenant "${tenant.name}". Please ask user to confirm.`,
          };
        } catch (error) {
          logger.error(`preview_create_company: Failed - ${error}`);
          throw error;
        }
      },
    }),

    confirm_create_company: tool({
      description:
        'Create a company after user confirms. Only call this after preview_create_company and getting user confirmation.',
      inputSchema: z.object({
        tenantId: z.string().uuid().describe('The tenant ID'),
        industry: z
          .enum(['TECHNOLOGY', 'MANUFACTURING', 'PROFESSIONAL_SERVICES', 'HEALTHCARE'])
          .describe('Industry type'),
        size: z.enum(['SIZE_11_50', 'SIZE_51_200', 'SIZE_200_PLUS']).describe('Company size'),
        timezone: z.string().optional().describe('Timezone'),
        currency: z.string().optional().describe('Currency code'),
      }),
      execute: async ({ tenantId, industry, size, timezone, currency }) => {
        logger.log(`confirm_create_company: Creating company for tenant ${tenantId}`);
        try {
          const db = database.drizzleClient;

          // Create the company
          const [company] = await db
            .insert(companies)
            .values({
              tenantId,
              industry,
              size,
              timezone: timezone || 'Asia/Kolkata',
              currency: currency || 'INR',
            })
            .returning();

          logger.log(`confirm_create_company: Created company ${company.id}`);
          return {
            success: true,
            message: `Company created successfully`,
            company: {
              id: company.id,
              tenantId: company.tenantId,
              industry: company.industry,
              size: company.size,
              timezone: company.timezone,
              currency: company.currency,
              createdAt: company.createdAt,
            },
          };
        } catch (error) {
          logger.error(`confirm_create_company: Failed - ${error}`);
          throw error;
        }
      },
    }),

    preview_create_business_unit: tool({
      description:
        'Preview business unit creation. Shows what will be created before actual creation. Use this first, then confirm_create_business_unit after user confirms.',
      inputSchema: z.object({
        companyId: z.string().uuid().describe('The company ID to create the business unit for'),
        name: z.string().min(2).max(255).describe('Business unit name'),
        code: z.string().min(1).max(20).describe('Unique code for the business unit (e.g., HQ, RND, SALES)'),
        city: z.string().min(2).describe('City'),
        state: z.string().min(2).describe('State'),
        country: z.string().default('India').optional().describe('Country (default: India)'),
        description: z.string().optional().describe('Description of the business unit'),
        phone: z.string().optional().describe('Contact phone number'),
        email: z.string().email().optional().describe('Contact email'),
        employeesCount: z.number().int().min(0).optional().describe('Number of employees'),
      }),
      execute: async ({ companyId, name, code, city, state, country, description, phone, email, employeesCount }) => {
        logger.log(`preview_create_business_unit: Previewing BU "${name}" (${code}) for company ${companyId}`);
        try {
          const db = database.drizzleClient;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = db.query as any;

          // Validate company exists and get tenant info
          const company = await query.companies?.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (c: any, { eq }: any) => eq(c.id, companyId),
          });
          if (!company) {
            return { success: false, error: 'Company not found', code: 'INVALID_COMPANY' };
          }

          // Get tenant name for display
          const tenant = await query.tenants?.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (t: any, { eq }: any) => eq(t.id, company.tenantId),
          });

          // Check for duplicate code in the same company
          // Fetch all BUs for the company and check code in JavaScript (relational query `and` doesn't work reliably)
          const allBUs = await query.businessUnits?.findMany({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (bu: any, { eq }: any) => eq(bu.companyId, companyId),
          });
          const existing = allBUs?.find((bu: { code: string }) => bu.code === code.toUpperCase());
          if (existing) {
            return {
              success: false,
              error: `Business unit with code "${code}" already exists in this company`,
              code: 'DUPLICATE_CODE',
              existingUnit: { id: existing.id, name: existing.name, code: existing.code },
            };
          }

          const companyDisplayName = tenant?.name || `Company ${companyId.slice(0, 8)}`;
          return {
            success: true,
            requiresConfirmation: true,
            preview: {
              companyId,
              companyName: companyDisplayName,
              name,
              code: code.toUpperCase(),
              city,
              state,
              country: country || 'India',
              description: description || null,
              phone: phone || null,
              email: email || null,
              employeesCount: employeesCount || 0,
            },
            message: `Ready to create business unit "${name}" (${code.toUpperCase()}) for "${companyDisplayName}". Please ask user to confirm.`,
          };
        } catch (error) {
          logger.error(`preview_create_business_unit: Failed - ${error}`);
          throw error;
        }
      },
    }),

    confirm_create_business_unit: tool({
      description:
        'Create a business unit after user confirms. Only call this after preview_create_business_unit and getting user confirmation.',
      inputSchema: z.object({
        companyId: z.string().uuid().describe('The company ID'),
        name: z.string().min(2).max(255).describe('Business unit name'),
        code: z.string().min(1).max(20).describe('Unique code'),
        city: z.string().describe('City'),
        state: z.string().describe('State'),
        country: z.string().optional().describe('Country'),
        description: z.string().optional().describe('Description'),
        phone: z.string().optional().describe('Phone'),
        email: z.string().optional().describe('Email'),
        employeesCount: z.number().int().optional().describe('Employee count'),
      }),
      execute: async ({ companyId, name, code, city, state, country, description, phone, email, employeesCount }) => {
        logger.log(`confirm_create_business_unit: Creating BU "${name}" (${code}) for company ${companyId}`);
        try {
          const db = database.drizzleClient;

          // Create the business unit
          const [bu] = await db
            .insert(businessUnits)
            .values({
              companyId,
              name,
              code: code.toUpperCase(),
              city,
              state,
              country: country || 'India',
              description: description || null,
              phone: phone || null,
              email: email || null,
              employeesCount: employeesCount || 0,
              status: 'ACTIVE',
            })
            .returning();

          // Update company's businessUnitsCount
          await db
            .update(companies)
            .set({ businessUnitsCount: sql`${companies.businessUnitsCount} + 1` })
            .where(eq(companies.id, companyId));

          logger.log(`confirm_create_business_unit: Created BU ${bu.id}`);
          return {
            success: true,
            message: `Business unit "${bu.name}" (${bu.code}) created successfully`,
            businessUnit: {
              id: bu.id,
              companyId: bu.companyId,
              name: bu.name,
              code: bu.code,
              city: bu.city,
              state: bu.state,
              country: bu.country,
              status: bu.status,
              employeesCount: bu.employeesCount,
              createdAt: bu.createdAt,
            },
          };
        } catch (error) {
          logger.error(`confirm_create_business_unit: Failed - ${error}`);
          throw error;
        }
      },
    }),
  };
}
