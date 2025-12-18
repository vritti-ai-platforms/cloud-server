import { pgSchema } from '@vritti/api-sdk/drizzle-pg-core';

/**
 * Cloud schema - all primary database tables live in the 'cloud' schema
 */
export const cloudSchema = pgSchema('cloud');
