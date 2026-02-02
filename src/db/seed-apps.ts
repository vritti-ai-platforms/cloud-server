import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { apps } from './schema';

// Parse .env file manually
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

const env = loadEnv();

// Use individual connection parameters for reliability
const host = env.PRIMARY_DB_HOST;
const port = Number(env.PRIMARY_DB_PORT) || 5432;
const user = env.PRIMARY_DB_USERNAME;
const password = env.PRIMARY_DB_PASSWORD;
const database = env.PRIMARY_DB_DATABASE;
const sslMode = env.PRIMARY_DB_SSL_MODE;

if (!host || !user || !password || !database) {
  throw new Error(
    'Database connection environment variables are required (PRIMARY_DB_HOST, PRIMARY_DB_USERNAME, PRIMARY_DB_PASSWORD, PRIMARY_DB_DATABASE)',
  );
}

const isLocalhost = host === 'localhost' || host === '127.0.0.1';

const client = new Client({
  host,
  port,
  user,
  password,
  database,
  ssl: isLocalhost || sslMode === 'disable' ? false : { rejectUnauthorized: false },
});

// Seed data for apps
const seedApps = [
  {
    name: 'HRMS',
    slug: 'hrms',
    icon: 'Users',
    description: 'Complete Human Resource Management System for employee lifecycle management, leave tracking, and performance reviews.',
    category: 'HR' as const,
    pricingTier: 'BASIC' as const,
    monthlyPrice: 0,
    isFeatured: true,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Healthcare', 'Retail', 'Professional Services', 'Manufacturing']),
  },
  {
    name: 'Payroll',
    slug: 'payroll',
    icon: 'Banknote',
    description: 'Automated payroll processing with tax calculations, compliance, and multi-currency support.',
    category: 'FINANCE' as const,
    pricingTier: 'PREMIUM' as const,
    monthlyPrice: 49900, // ₹499
    isFeatured: true,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Healthcare', 'Retail', 'Professional Services', 'Manufacturing']),
  },
  {
    name: 'Attendance',
    slug: 'attendance',
    icon: 'Clock',
    description: 'Time and attendance tracking with biometric integration, shift management, and overtime calculations.',
    category: 'HR' as const,
    pricingTier: 'FREE' as const,
    monthlyPrice: 0,
    isFeatured: false,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Retail', 'Manufacturing', 'F&B']),
  },
  {
    name: 'Inventory',
    slug: 'inventory',
    icon: 'Package',
    description: 'Stock management, warehouse tracking, and inventory optimization with real-time updates.',
    category: 'OPERATIONS' as const,
    pricingTier: 'BASIC' as const,
    monthlyPrice: 29900, // ₹299
    isFeatured: true,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Retail', 'Manufacturing', 'F&B']),
  },
  {
    name: 'POS',
    slug: 'pos',
    icon: 'ShoppingCart',
    description: 'Point of Sale system with barcode scanning, receipt printing, and payment integrations.',
    category: 'SALES' as const,
    pricingTier: 'PREMIUM' as const,
    monthlyPrice: 79900, // ₹799
    isFeatured: true,
    isNew: true,
    recommendedIndustries: JSON.stringify(['Retail', 'F&B']),
  },
  {
    name: 'CRM',
    slug: 'crm',
    icon: 'Handshake',
    description: 'Customer Relationship Management with lead tracking, pipeline management, and analytics.',
    category: 'SALES' as const,
    pricingTier: 'BASIC' as const,
    monthlyPrice: 39900, // ₹399
    isFeatured: false,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Professional Services', 'Technology', 'Healthcare']),
  },
  {
    name: 'Accounting',
    slug: 'accounting',
    icon: 'Calculator',
    description: 'Full-featured accounting with GST compliance, invoicing, and financial reporting.',
    category: 'FINANCE' as const,
    pricingTier: 'PREMIUM' as const,
    monthlyPrice: 59900, // ₹599
    isFeatured: false,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Professional Services', 'Manufacturing', 'Retail']),
  },
  {
    name: 'Projects',
    slug: 'projects',
    icon: 'FolderKanban',
    description: 'Project management with task tracking, timelines, and team collaboration.',
    category: 'OPERATIONS' as const,
    pricingTier: 'BASIC' as const,
    monthlyPrice: 24900, // ₹249
    isFeatured: false,
    isNew: true,
    recommendedIndustries: JSON.stringify(['Professional Services', 'Technology']),
  },
  {
    name: 'Analytics',
    slug: 'analytics',
    icon: 'BarChart3',
    description: 'Business intelligence dashboards with custom reports and data visualization.',
    category: 'ANALYTICS' as const,
    pricingTier: 'ENTERPRISE' as const,
    monthlyPrice: 99900, // ₹999
    isFeatured: true,
    isNew: true,
    recommendedIndustries: JSON.stringify(['Healthcare', 'Retail', 'Manufacturing', 'Technology']),
  },
  {
    name: 'Communication',
    slug: 'communication',
    icon: 'MessageSquare',
    description: 'Internal messaging, announcements, and team communication hub.',
    category: 'COMMUNICATION' as const,
    pricingTier: 'FREE' as const,
    monthlyPrice: 0,
    isFeatured: false,
    isNew: false,
    recommendedIndustries: JSON.stringify(['Healthcare', 'Retail', 'Professional Services', 'Manufacturing', 'Technology']),
  },
];

async function seedAppsData() {
  console.log('Starting apps seed...\n');

  // Connect to database
  await client.connect();
  const db = drizzle(client);

  try {
    // Check if apps already exist
    const existingApps = await db.select().from(apps);
    if (existingApps.length > 0) {
      console.log(`Found ${existingApps.length} existing apps. Skipping seed.`);
      console.log('To reseed, truncate the apps table first.');
      return;
    }

    // Insert apps
    console.log('Inserting apps...');
    const insertedApps = await db.insert(apps).values(seedApps).returning();
    console.log(`Inserted ${insertedApps.length} apps\n`);

    console.log('Apps seed completed successfully!');
    console.log('\nInserted apps:');
    insertedApps.forEach((app) => {
      console.log(`  - ${app.name} (${app.slug}) - ${app.pricingTier}`);
    });
  } catch (error) {
    console.error('Apps seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seedAppsData();
