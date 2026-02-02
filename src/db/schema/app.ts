import { boolean, index, integer, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { appCategoryEnum, appStatusEnum, pricingTypeEnum } from './enums';

/**
 * Apps - Global app marketplace catalog
 * Defines all available apps that companies/BUs can enable
 */
export const apps = cloudSchema.table(
  'apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    icon: varchar('icon', { length: 50 }).notNull(), // Lucide icon name
    description: text('description'),

    // Categorization
    category: appCategoryEnum('category').notNull(),

    // Pricing
    pricingTier: pricingTypeEnum('pricing_tier').notNull().default('FREE'),
    monthlyPrice: integer('monthly_price').notNull().default(0), // In smallest currency unit (paise)

    // Display flags
    isFeatured: boolean('is_featured').notNull().default(false),
    isNew: boolean('is_new').notNull().default(false),

    // Recommended industries (stored as JSON array)
    recommendedIndustries: text('recommended_industries'), // JSON array of IndustryType values

    // Dependencies (other app IDs required)
    dependencies: text('dependencies'), // JSON array of app IDs

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('apps_slug_idx').on(table.slug),
    index('apps_category_idx').on(table.category),
    index('apps_pricing_tier_idx').on(table.pricingTier),
  ],
);

// Type exports
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
