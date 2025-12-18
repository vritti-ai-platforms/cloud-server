import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  schemaFilter: ['cloud'],
  dbCredentials: {
    url: process.env.PRIMARY_DB_DATABASE_DIRECT_URL!,
  },
  verbose: true,
  strict: true,
});
