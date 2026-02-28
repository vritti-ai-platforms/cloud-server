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
    prices: r.many.prices(),
    industries: r.many.industries({
      from: r.plans.id.through(r.prices.planId),
      to: r.industries.id.through(r.prices.industryId),
    }),
    regions: r.many.regions({
      from: r.plans.id.through(r.prices.planId),
      to: r.regions.id.through(r.prices.regionId),
    }),
    cloudProviders: r.many.cloudProviders({
      from: r.plans.id.through(r.prices.planId),
      to: r.cloudProviders.id.through(r.prices.providerId),
    }),
    deployments: r.many.deployments({
      from: r.plans.id.through(r.deploymentIndustryPlans.planId),
      to: r.deployments.id.through(r.deploymentIndustryPlans.deploymentId),
    }),
  },

  // Industry relations
  industries: {
    organizations: r.many.organizations(),
    prices: r.many.prices(),
    plans: r.many.plans({
      from: r.industries.id.through(r.prices.industryId),
      to: r.plans.id.through(r.prices.planId),
    }),
    deployments: r.many.deployments({
      from: r.industries.id.through(r.deploymentIndustryPlans.industryId),
      to: r.deployments.id.through(r.deploymentIndustryPlans.deploymentId),
    }),
  },

  // Deployment relations
  deployments: {
    organizations: r.many.organizations(),
    industryPlans: r.many.deploymentIndustryPlans(),
    plans: r.many.plans({
      from: r.deployments.id.through(r.deploymentIndustryPlans.deploymentId),
      to: r.plans.id.through(r.deploymentIndustryPlans.planId),
    }),
    industries: r.many.industries({
      from: r.deployments.id.through(r.deploymentIndustryPlans.deploymentId),
      to: r.industries.id.through(r.deploymentIndustryPlans.industryId),
    }),
  },

  // Region relations
  regions: {
    cloudProviders: r.many.cloudProviders({
      from: r.regions.id.through(r.regionCloudProviders.regionId),
      to: r.cloudProviders.id.through(r.regionCloudProviders.providerId),
    }),
    prices: r.many.prices(),
    plans: r.many.plans({
      from: r.regions.id.through(r.prices.regionId),
      to: r.plans.id.through(r.prices.planId),
    }),
  },

  // Cloud provider relations
  cloudProviders: {
    regions: r.many.regions({
      from: r.cloudProviders.id.through(r.regionCloudProviders.providerId),
      to: r.regions.id.through(r.regionCloudProviders.regionId),
    }),
    prices: r.many.prices(),
    plans: r.many.plans({
      from: r.cloudProviders.id.through(r.prices.providerId),
      to: r.plans.id.through(r.prices.planId),
    }),
  },

  // Prices relations
  prices: {
    plan: r.one.plans({
      from: r.prices.planId,
      to: r.plans.id,
    }),
    industry: r.one.industries({
      from: r.prices.industryId,
      to: r.industries.id,
    }),
    region: r.one.regions({
      from: r.prices.regionId,
      to: r.regions.id,
    }),
    cloudProvider: r.one.cloudProviders({
      from: r.prices.providerId,
      to: r.cloudProviders.id,
    }),
  },

  // Deployment-Industry-Plan join table relations
  deploymentIndustryPlans: {
    deployment: r.one.deployments({
      from: r.deploymentIndustryPlans.deploymentId,
      to: r.deployments.id,
    }),
    plan: r.one.plans({
      from: r.deploymentIndustryPlans.planId,
      to: r.plans.id,
    }),
    industry: r.one.industries({
      from: r.deploymentIndustryPlans.industryId,
      to: r.industries.id,
    }),
  },

  // Region-CloudProvider join table relations
  regionCloudProviders: {
    region: r.one.regions({
      from: r.regionCloudProviders.regionId,
      to: r.regions.id,
    }),
    cloudProvider: r.one.cloudProviders({
      from: r.regionCloudProviders.providerId,
      to: r.cloudProviders.id,
    }),
  },
}));
