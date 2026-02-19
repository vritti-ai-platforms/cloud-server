import { defineRelations } from '@vritti/api-sdk/drizzle-orm';
import * as schema from './index';

export const relations = defineRelations(schema, (r) => ({
  // Tenant relations
  tenants: {
    databaseConfig: r.one.tenantDatabaseConfigs({
      from: r.tenants.id,
      to: r.tenantDatabaseConfigs.tenantId,
    }),
  },
  tenantDatabaseConfigs: {
    tenant: r.one.tenants({
      from: r.tenantDatabaseConfigs.tenantId,
      to: r.tenants.id,
    }),
  },

  // User relations
  users: {
    verifications: r.many.verifications(),
    twoFactorAuth: r.many.twoFactorAuth(),
    oauthProviders: r.many.oauthProviders(),
    sessions: r.many.sessions(),
  },

  // Session relations
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },

  // OAuth provider relations
  oauthProviders: {
    user: r.one.users({
      from: r.oauthProviders.userId,
      to: r.users.id,
    }),
  },

  // Verification relations
  verifications: {
    user: r.one.users({
      from: r.verifications.userId,
      to: r.users.id,
    }),
  },

  // Two-factor auth relations
  twoFactorAuth: {
    user: r.one.users({
      from: r.twoFactorAuth.userId,
      to: r.users.id,
    }),
  },
}));
