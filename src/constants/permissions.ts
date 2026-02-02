/**
 * Permission Catalog
 * Defines all available permissions in the system
 * These are stored as VARCHAR codes in role_permissions table
 */

export type PermissionCategory =
  | 'USERS'
  | 'BUSINESS_UNITS'
  | 'ROLES'
  | 'APPS'
  | 'SETTINGS'
  | 'COMPANY'
  | 'INVITATIONS'
  | 'ACTIVITY';

export interface PermissionDefinition {
  name: string;
  description: string;
  category: PermissionCategory;
}

export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // Users
  'users.view': {
    name: 'View Users',
    description: 'Can view user list and profiles',
    category: 'USERS',
  },
  'users.create': {
    name: 'Create Users',
    description: 'Can add new users to the company',
    category: 'USERS',
  },
  'users.edit': {
    name: 'Edit Users',
    description: 'Can edit user information',
    category: 'USERS',
  },
  'users.delete': {
    name: 'Delete Users',
    description: 'Can remove users from the company',
    category: 'USERS',
  },
  'users.invite': {
    name: 'Invite Users',
    description: 'Can send invitations to new users',
    category: 'USERS',
  },

  // Business Units
  'business_units.view': {
    name: 'View Business Units',
    description: 'Can view business unit list and details',
    category: 'BUSINESS_UNITS',
  },
  'business_units.create': {
    name: 'Create Business Units',
    description: 'Can create new business units',
    category: 'BUSINESS_UNITS',
  },
  'business_units.edit': {
    name: 'Edit Business Units',
    description: 'Can edit business unit information',
    category: 'BUSINESS_UNITS',
  },
  'business_units.delete': {
    name: 'Delete Business Units',
    description: 'Can archive or delete business units',
    category: 'BUSINESS_UNITS',
  },
  'business_units.assign_members': {
    name: 'Assign Members to BU',
    description: 'Can assign and remove members from business units',
    category: 'BUSINESS_UNITS',
  },

  // Roles
  'roles.view': {
    name: 'View Roles',
    description: 'Can view roles and their permissions',
    category: 'ROLES',
  },
  'roles.create': {
    name: 'Create Roles',
    description: 'Can create custom roles',
    category: 'ROLES',
  },
  'roles.edit': {
    name: 'Edit Roles',
    description: 'Can edit role permissions',
    category: 'ROLES',
  },
  'roles.delete': {
    name: 'Delete Roles',
    description: 'Can delete custom roles',
    category: 'ROLES',
  },
  'roles.assign': {
    name: 'Assign Roles',
    description: 'Can assign roles to users',
    category: 'ROLES',
  },

  // Apps
  'apps.view': {
    name: 'View Apps',
    description: 'Can view app marketplace and enabled apps',
    category: 'APPS',
  },
  'apps.enable': {
    name: 'Enable Apps',
    description: 'Can enable apps for company or business units',
    category: 'APPS',
  },
  'apps.disable': {
    name: 'Disable Apps',
    description: 'Can disable apps',
    category: 'APPS',
  },
  'apps.configure': {
    name: 'Configure Apps',
    description: 'Can configure app settings',
    category: 'APPS',
  },

  // Company
  'company.view': {
    name: 'View Company',
    description: 'Can view company information',
    category: 'COMPANY',
  },
  'company.edit': {
    name: 'Edit Company',
    description: 'Can edit company settings',
    category: 'COMPANY',
  },
  'company.delete': {
    name: 'Delete Company',
    description: 'Can archive or delete the company',
    category: 'COMPANY',
  },
  'company.billing': {
    name: 'Manage Billing',
    description: 'Can manage company billing and subscription',
    category: 'COMPANY',
  },

  // Invitations
  'invitations.view': {
    name: 'View Invitations',
    description: 'Can view pending invitations',
    category: 'INVITATIONS',
  },
  'invitations.send': {
    name: 'Send Invitations',
    description: 'Can send new invitations',
    category: 'INVITATIONS',
  },
  'invitations.revoke': {
    name: 'Revoke Invitations',
    description: 'Can revoke pending invitations',
    category: 'INVITATIONS',
  },

  // Activity
  'activity.view': {
    name: 'View Activity',
    description: 'Can view activity logs',
    category: 'ACTIVITY',
  },
  'activity.export': {
    name: 'Export Activity',
    description: 'Can export activity logs',
    category: 'ACTIVITY',
  },

  // Settings
  'settings.view': {
    name: 'View Settings',
    description: 'Can view company settings',
    category: 'SETTINGS',
  },
  'settings.edit': {
    name: 'Edit Settings',
    description: 'Can edit company settings',
    category: 'SETTINGS',
  },
} as const;

// All permission codes
export const ALL_PERMISSION_CODES = Object.keys(PERMISSIONS);

// Default role permission sets
export const OWNER_PERMISSIONS = ALL_PERMISSION_CODES;

export const ADMIN_PERMISSIONS = ALL_PERMISSION_CODES.filter(
  (p) => !['company.delete', 'company.billing'].includes(p),
);

export const MANAGER_PERMISSIONS = [
  'users.view',
  'users.invite',
  'business_units.view',
  'business_units.edit',
  'business_units.assign_members',
  'roles.view',
  'apps.view',
  'company.view',
  'invitations.view',
  'invitations.send',
  'activity.view',
  'settings.view',
];

export const EMPLOYEE_PERMISSIONS = [
  'users.view',
  'business_units.view',
  'roles.view',
  'apps.view',
  'company.view',
  'activity.view',
];

// Helper to get permissions by category
export function getPermissionsByCategory(category: PermissionCategory): string[] {
  return Object.entries(PERMISSIONS)
    .filter(([, def]) => def.category === category)
    .map(([code]) => code);
}

// Helper to validate permission codes
export function isValidPermissionCode(code: string): boolean {
  return code in PERMISSIONS;
}

// Helper to get permission definition
export function getPermissionDefinition(code: string): PermissionDefinition | undefined {
  return PERMISSIONS[code];
}
