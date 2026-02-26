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
    mfaAuth: r.many.mfaAuth(),
    oauthProviders: r.many.oauthProviders(),
    sessions: r.many.sessions(),
    organizationMembers: r.many.organizationMembers(),
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

  // MFA auth relations
  mfaAuth: {
    user: r.one.users({
      from: r.mfaAuth.userId,
      to: r.users.id,
    }),
  },

  // Organization relations
  organizations: {
    members: r.many.organizationMembers(),
    plan: r.one.plans({
      from: r.organizations.planId,
      to: r.plans.id,
    }),
    industry: r.one.industries({
      from: r.organizations.industryId,
      to: r.industries.id,
    }),
    deployment: r.one.deployments({
      from: r.organizations.deploymentId,
      to: r.deployments.id,
    }),
  },

  // Organization member relations
  organizationMembers: {
    organization: r.one.organizations({
      from: r.organizationMembers.organizationId,
      to: r.organizations.id,
    }),
    user: r.one.users({
      from: r.organizationMembers.userId,
      to: r.users.id,
    }),
  },

  // Plan relations
  plans: {
    organizations: r.many.organizations(),
    industryPlans: r.many.industryPlans(),
  },

  // Industry relations
  industries: {
    organizations: r.many.organizations(),
    industryPlans: r.many.industryPlans(),
    industryDeployments: r.many.industryDeployments(),
  },

  // Deployment relations
  deployments: {
    organizations: r.many.organizations(),
    industryDeployments: r.many.industryDeployments(),
  },

  // Industry-Plan join table relations
  industryPlans: {
    industry: r.one.industries({
      from: r.industryPlans.industryId,
      to: r.industries.id,
    }),
    plan: r.one.plans({
      from: r.industryPlans.planId,
      to: r.plans.id,
    }),
  },

  // Industry-Deployment join table relations
  industryDeployments: {
    industry: r.one.industries({
      from: r.industryDeployments.industryId,
      to: r.industries.id,
    }),
    deployment: r.one.deployments({
      from: r.industryDeployments.deploymentId,
      to: r.deployments.id,
    }),
  },
}));
