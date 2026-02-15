import { defineRelations } from '@vritti/api-sdk/drizzle-orm';
import * as schema from './index';

export const relations = defineRelations(schema, (r) => ({
  // Tenant relations
  tenants: {
    databaseConfig: r.one.tenantDatabaseConfigs({
      from: r.tenants.id,
      to: r.tenantDatabaseConfigs.tenantId,
    }),
    inboxes: r.many.inboxes(),
    contacts: r.many.contacts(),
    conversations: r.many.conversations(),
    cannedResponses: r.many.cannedResponses(),
  },
  tenantDatabaseConfigs: {
    tenant: r.one.tenants({
      from: r.tenantDatabaseConfigs.tenantId,
      to: r.tenants.id,
    }),
  },

  // User relations
  users: {
    emailVerifications: r.many.emailVerifications(),
    mobileVerifications: r.many.mobileVerifications(),
    twoFactorAuth: r.many.twoFactorAuth(),
    oauthProviders: r.many.oauthProviders(),
    sessions: r.many.sessions(),
    assignedConversations: r.many.conversations({
      from: r.users.id,
      to: r.conversations.assignedAgentId,
    }),
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

  // Inbox relations
  inboxes: {
    tenant: r.one.tenants({
      from: r.inboxes.tenantId,
      to: r.tenants.id,
    }),
    contactInboxes: r.many.contactInboxes(),
    conversations: r.many.conversations(),
  },

  // Contact relations
  contacts: {
    tenant: r.one.tenants({
      from: r.contacts.tenantId,
      to: r.tenants.id,
    }),
    contactInboxes: r.many.contactInboxes(),
    conversations: r.many.conversations(),
  },

  // Contact inbox relations
  contactInboxes: {
    contact: r.one.contacts({
      from: r.contactInboxes.contactId,
      to: r.contacts.id,
    }),
    inbox: r.one.inboxes({
      from: r.contactInboxes.inboxId,
      to: r.inboxes.id,
    }),
    conversations: r.many.conversations(),
  },

  // Conversation relations
  conversations: {
    tenant: r.one.tenants({
      from: r.conversations.tenantId,
      to: r.tenants.id,
    }),
    inbox: r.one.inboxes({
      from: r.conversations.inboxId,
      to: r.inboxes.id,
    }),
    contact: r.one.contacts({
      from: r.conversations.contactId,
      to: r.contacts.id,
    }),
    contactInbox: r.one.contactInboxes({
      from: r.conversations.contactInboxId,
      to: r.contactInboxes.id,
    }),
    assignedAgent: r.one.users({
      from: r.conversations.assignedAgentId,
      to: r.users.id,
    }),
    messages: r.many.messages(),
  },

  // Message relations
  messages: {
    conversation: r.one.conversations({
      from: r.messages.conversationId,
      to: r.conversations.id,
    }),
  },

  // Canned response relations
  cannedResponses: {
    tenant: r.one.tenants({
      from: r.cannedResponses.tenantId,
      to: r.tenants.id,
    }),
  },
}));
