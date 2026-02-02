import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, and } from '@vritti/api-sdk/drizzle-orm';
import { apps, companyApps } from '@/db/schema';

type App = typeof apps.$inferSelect;
type CompanyApp = typeof companyApps.$inferSelect;
type NewCompanyApp = typeof companyApps.$inferInsert;

@Injectable()
export class AppRepository extends PrimaryBaseRepository<typeof apps> {
  constructor(database: PrimaryDatabaseService) {
    super(database, apps);
  }

  /**
   * Get all available apps
   */
  async findAllApps(): Promise<App[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get apps by category
   */
  async findByCategory(category: string): Promise<App[]> {
    return this.model.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single app by ID
   */
  async findAppById(appId: string): Promise<App | undefined> {
    return this.model.findFirst({
      where: { id: appId },
    });
  }

  /**
   * Get a single app by slug
   */
  async findBySlug(slug: string): Promise<App | undefined> {
    return this.model.findFirst({
      where: { slug },
    });
  }

  /**
   * Get all company apps for a company
   */
  async findCompanyApps(companyId: string): Promise<CompanyApp[]> {
    return this.db
      .select()
      .from(companyApps)
      .where(eq(companyApps.companyId, companyId));
  }

  /**
   * Get a specific company app record
   */
  async findCompanyApp(companyId: string, appId: string): Promise<CompanyApp | undefined> {
    const result = await this.db
      .select()
      .from(companyApps)
      .where(and(eq(companyApps.companyId, companyId), eq(companyApps.appId, appId)))
      .limit(1);
    return result[0];
  }

  /**
   * Enable an app for a company
   */
  async enableApp(companyId: string, appId: string, enabledBy?: string): Promise<CompanyApp> {
    const data: NewCompanyApp = {
      companyId,
      appId,
      status: 'ACTIVE',
      enabledBy: enabledBy ?? null,
      enabledAt: new Date(),
    };

    const result = await this.db.insert(companyApps).values(data).returning();
    return result[0];
  }

  /**
   * Disable an app for a company (soft delete by updating status)
   */
  async disableApp(companyId: string, appId: string): Promise<void> {
    await this.db
      .update(companyApps)
      .set({ status: 'DISABLED' })
      .where(and(eq(companyApps.companyId, companyId), eq(companyApps.appId, appId)));
  }

  /**
   * Re-enable a previously disabled app
   */
  async reEnableApp(companyId: string, appId: string, enabledBy?: string): Promise<CompanyApp> {
    const result = await this.db
      .update(companyApps)
      .set({
        status: 'ACTIVE',
        enabledBy: enabledBy ?? null,
        enabledAt: new Date(),
      })
      .where(and(eq(companyApps.companyId, companyId), eq(companyApps.appId, appId)))
      .returning();
    return result[0];
  }

  /**
   * Delete an app for a company (hard delete)
   */
  async deleteCompanyApp(companyId: string, appId: string): Promise<void> {
    await this.db
      .delete(companyApps)
      .where(and(eq(companyApps.companyId, companyId), eq(companyApps.appId, appId)));
  }

  /**
   * Get all apps with their enabled status for a company
   */
  async findAllAppsWithStatus(companyId: string): Promise<{ app: App; companyApp: CompanyApp | null }[]> {
    const allApps = await this.findAllApps();
    const enabledApps = await this.findCompanyApps(companyId);

    const enabledAppsMap = new Map(enabledApps.map((ca) => [ca.appId, ca]));

    return allApps.map((app) => ({
      app,
      companyApp: enabledAppsMap.get(app.id) ?? null,
    }));
  }
}
