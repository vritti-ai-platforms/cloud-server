import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, and, sql } from '@vritti/api-sdk/drizzle-orm';
import { roles, rolePermissions, type NewRolePermission } from '@/db/schema';

type Role = typeof roles.$inferSelect;
type RolePermission = typeof rolePermissions.$inferSelect;

@Injectable()
export class RoleRepository extends PrimaryBaseRepository<typeof roles> {
  constructor(database: PrimaryDatabaseService) {
    super(database, roles);
  }

  async findByCompanyId(companyId: string): Promise<Role[]> {
    return this.model.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdWithPermissions(
    id: string,
  ): Promise<{ role: Role; permissions: RolePermission[] } | null> {
    const role = await this.findById(id);
    if (!role) return null;

    const permissions = await this.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));

    return { role, permissions };
  }

  async findByCompanyIdWithPermissions(
    companyId: string,
  ): Promise<Array<{ role: Role; permissions: RolePermission[] }>> {
    const companyRoles = await this.findByCompanyId(companyId);

    const results = await Promise.all(
      companyRoles.map(async (role) => {
        const permissions = await this.db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));
        return { role, permissions };
      }),
    );

    return results;
  }

  async findByName(companyId: string, name: string): Promise<Role | undefined> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findFirst({
      where: { companyId, name },
    });
  }

  async setPermissions(roleId: string, permissionCodes: string[]): Promise<void> {
    // Delete existing permissions
    await this.db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    // Insert new permissions
    if (permissionCodes.length > 0) {
      const newPermissions: NewRolePermission[] = permissionCodes.map((code) => ({
        roleId,
        permissionCode: code,
      }));

      await this.db.insert(rolePermissions).values(newPermissions);
    }
  }

  async getPermissions(roleId: string): Promise<RolePermission[]> {
    return this.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
  }

  async incrementUserCount(roleId: string): Promise<void> {
    await this.db
      .update(roles)
      .set({ userCount: sql`${roles.userCount} + 1` })
      .where(eq(roles.id, roleId));
  }

  async decrementUserCount(roleId: string): Promise<void> {
    await this.db
      .update(roles)
      .set({ userCount: sql`GREATEST(${roles.userCount} - 1, 0)` })
      .where(eq(roles.id, roleId));
  }
}
