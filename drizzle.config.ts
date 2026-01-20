import { defineConfig } from 'drizzle-kit';

const dbUrl = process.env.PRIMARY_DB_DATABASE_DIRECT_URL;
if (!dbUrl) {
  throw new Error('PRIMARY_DB_DATABASE_DIRECT_URL environment variable is required');
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  schemaFilter: ['cloud'],
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
});
