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
    companyMembers: r.many.companyMembers(),
    companyApps: r.many.companyApps(),
    roles: r.many.roles(),
    invitations: r.many.invitations(),
    activityLogs: r.many.activityLogs(),
  },

  // Business Unit relations
  businessUnits: {
    company: r.one.companies({
      from: r.businessUnits.companyId,
      to: r.companies.id,
    }),
    businessUnitMembers: r.many.businessUnitMembers(),
    businessUnitApps: r.many.businessUnitApps(),
  },

  // User relations
  users: {
    emailVerifications: r.many.emailVerifications(),
    mobileVerifications: r.many.mobileVerifications(),
    twoFactorAuth: r.many.twoFactorAuth(),
    oauthProviders: r.many.oauthProviders(),
    sessions: r.many.sessions(),
    chatConversations: r.many.chatConversations(),
    companyMembers: r.many.companyMembers(),
    invitationsSent: r.many.invitations({
      from: r.users.id,
      to: r.invitations.invitedBy,
      alias: 'invitationsSent',
    }),
    activityLogs: r.many.activityLogs(),
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

  // App relations
  apps: {
    companyApps: r.many.companyApps(),
    businessUnitApps: r.many.businessUnitApps(),
  },

  // Role relations
  roles: {
    company: r.one.companies({
      from: r.roles.companyId,
      to: r.companies.id,
    }),
    rolePermissions: r.many.rolePermissions(),
    memberRoles: r.many.memberRoles(),
    businessUnitMemberRoles: r.many.businessUnitMemberRoles(),
    invitations: r.many.invitations(),
  },

  // Role permissions relations
  rolePermissions: {
    role: r.one.roles({
      from: r.rolePermissions.roleId,
      to: r.roles.id,
    }),
  },

  // Company member relations
  companyMembers: {
    company: r.one.companies({
      from: r.companyMembers.companyId,
      to: r.companies.id,
    }),
    user: r.one.users({
      from: r.companyMembers.userId,
      to: r.users.id,
    }),
    invitedByUser: r.one.users({
      from: r.companyMembers.invitedBy,
      to: r.users.id,
      alias: 'invitedByUser',
    }),
    memberRoles: r.many.memberRoles(),
    businessUnitMembers: r.many.businessUnitMembers(),
  },

  // Member roles relations
  memberRoles: {
    companyMember: r.one.companyMembers({
      from: r.memberRoles.companyMemberId,
      to: r.companyMembers.id,
    }),
    role: r.one.roles({
      from: r.memberRoles.roleId,
      to: r.roles.id,
    }),
    assignedByMember: r.one.companyMembers({
      from: r.memberRoles.assignedBy,
      to: r.companyMembers.id,
      alias: 'assignedByMember',
    }),
  },

  // Business unit member relations
  businessUnitMembers: {
    businessUnit: r.one.businessUnits({
      from: r.businessUnitMembers.businessUnitId,
      to: r.businessUnits.id,
    }),
    companyMember: r.one.companyMembers({
      from: r.businessUnitMembers.companyMemberId,
      to: r.companyMembers.id,
    }),
    assignedByMember: r.one.companyMembers({
      from: r.businessUnitMembers.assignedBy,
      to: r.companyMembers.id,
      alias: 'assignedByMember',
    }),
    businessUnitMemberRoles: r.many.businessUnitMemberRoles(),
  },

  // Business unit member roles relations
  businessUnitMemberRoles: {
    businessUnitMember: r.one.businessUnitMembers({
      from: r.businessUnitMemberRoles.businessUnitMemberId,
      to: r.businessUnitMembers.id,
    }),
    role: r.one.roles({
      from: r.businessUnitMemberRoles.roleId,
      to: r.roles.id,
    }),
    assignedByMember: r.one.companyMembers({
      from: r.businessUnitMemberRoles.assignedBy,
      to: r.companyMembers.id,
      alias: 'assignedByMember',
    }),
  },

  // Invitation relations
  invitations: {
    company: r.one.companies({
      from: r.invitations.companyId,
      to: r.companies.id,
    }),
    role: r.one.roles({
      from: r.invitations.roleId,
      to: r.roles.id,
    }),
    businessUnit: r.one.businessUnits({
      from: r.invitations.businessUnitId,
      to: r.businessUnits.id,
    }),
    invitedByUser: r.one.users({
      from: r.invitations.invitedBy,
      to: r.users.id,
      alias: 'invitedByUser',
    }),
    inviteeUser: r.one.users({
      from: r.invitations.inviteeUserId,
      to: r.users.id,
      alias: 'inviteeUser',
    }),
  },

  // Company apps relations
  companyApps: {
    company: r.one.companies({
      from: r.companyApps.companyId,
      to: r.companies.id,
    }),
    app: r.one.apps({
      from: r.companyApps.appId,
      to: r.apps.id,
    }),
    enabledByMember: r.one.companyMembers({
      from: r.companyApps.enabledBy,
      to: r.companyMembers.id,
      alias: 'enabledByMember',
    }),
  },

  // Business unit apps relations
  businessUnitApps: {
    businessUnit: r.one.businessUnits({
      from: r.businessUnitApps.businessUnitId,
      to: r.businessUnits.id,
    }),
    app: r.one.apps({
      from: r.businessUnitApps.appId,
      to: r.apps.id,
    }),
    enabledByMember: r.one.companyMembers({
      from: r.businessUnitApps.enabledBy,
      to: r.companyMembers.id,
      alias: 'enabledByMember',
    }),
  },

  // Activity logs relations
  activityLogs: {
    company: r.one.companies({
      from: r.activityLogs.companyId,
      to: r.companies.id,
    }),
    user: r.one.users({
      from: r.activityLogs.userId,
      to: r.users.id,
    }),
  },
}));
