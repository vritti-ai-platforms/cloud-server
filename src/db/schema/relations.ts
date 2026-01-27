import { defineRelations } from '@vritti/api-sdk/drizzle-orm';
import * as schema from './index';

export const relations = defineRelations(schema, (r) => ({
  // Tenant relations
  tenants: {
    databaseConfig: r.one.tenantDatabaseConfigs({
      from: r.tenants.id,
      to: r.tenantDatabaseConfigs.tenantId,
    }),
    company: r.one.companies({
      from: r.tenants.id,
      to: r.companies.tenantId,
    }),
  },
  tenantDatabaseConfigs: {
    tenant: r.one.tenants({
      from: r.tenantDatabaseConfigs.tenantId,
      to: r.tenants.id,
    }),
  },

  // Company relations
  companies: {
    tenant: r.one.tenants({
      from: r.companies.tenantId,
      to: r.tenants.id,
    }),
    businessUnits: r.many.businessUnits(),
  },

  // Business Unit relations
  businessUnits: {
    company: r.one.companies({
      from: r.businessUnits.companyId,
      to: r.companies.id,
    }),
  },

  // User relations
  users: {
    emailVerifications: r.many.emailVerifications(),
    mobileVerifications: r.many.mobileVerifications(),
    twoFactorAuth: r.many.twoFactorAuth(),
    oauthProviders: r.many.oauthProviders(),
    sessions: r.many.sessions(),
    chatConversations: r.many.chatConversations(),
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

  // Email verification relations
  emailVerifications: {
    user: r.one.users({
      from: r.emailVerifications.userId,
      to: r.users.id,
    }),
  },

  // Mobile verification relations
  mobileVerifications: {
    user: r.one.users({
      from: r.mobileVerifications.userId,
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

  // Chat conversation relations
  chatConversations: {
    user: r.one.users({
      from: r.chatConversations.userId,
      to: r.users.id,
    }),
    messages: r.many.chatMessages(),
  },

  // Chat message relations
  chatMessages: {
    conversation: r.one.chatConversations({
      from: r.chatMessages.conversationId,
      to: r.chatConversations.id,
    }),
  },
}));
