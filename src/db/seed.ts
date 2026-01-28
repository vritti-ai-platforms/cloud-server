import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { businessUnits, companies, tenants } from './schema';

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

// Seed data
const seedTenants = [
  {
    subdomain: 'acme',
    name: 'Acme Corporation',
    description: 'A leading technology company specializing in innovative solutions',
    dbType: 'SHARED' as const,
    status: 'ACTIVE' as const,
  },
  {
    subdomain: 'globex',
    name: 'Globex Industries',
    description: 'Global manufacturing and distribution company',
    dbType: 'SHARED' as const,
    status: 'ACTIVE' as const,
  },
  {
    subdomain: 'initech',
    name: 'Initech Solutions',
    description: 'Enterprise software and consulting services',
    dbType: 'DEDICATED' as const,
    status: 'ACTIVE' as const,
  },
  {
    subdomain: 'umbrella',
    name: 'Umbrella Healthcare',
    description: 'Healthcare services and pharmaceutical research',
    dbType: 'SHARED' as const,
    status: 'ACTIVE' as const,
  },
  {
    subdomain: 'wayne',
    name: 'Wayne Enterprises',
    description: 'Diversified conglomerate with interests in technology and manufacturing',
    dbType: 'DEDICATED' as const,
    status: 'ACTIVE' as const,
  },
];

async function seed() {
  console.log('Starting seed...\n');

  // Connect to database
  await client.connect();
  const db = drizzle(client);

  try {
    // Insert tenants
    console.log('Inserting tenants...');
    const insertedTenants = await db.insert(tenants).values(seedTenants).returning();
    console.log(`Inserted ${insertedTenants.length} tenants\n`);

    // Create companies for each tenant
    console.log('Inserting companies...');
    const companyData = insertedTenants.map((tenant, index) => ({
      tenantId: tenant.id,
      industry: (['TECHNOLOGY', 'MANUFACTURING', 'PROFESSIONAL_SERVICES', 'HEALTHCARE', 'TECHNOLOGY'] as const)[index],
      size: (['SIZE_51_200', 'SIZE_200_PLUS', 'SIZE_11_50', 'SIZE_200_PLUS', 'SIZE_200_PLUS'] as const)[index],
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      dbRegion: 'AP_SOUTH_1' as const,
      usersCount: [45, 230, 28, 180, 500][index],
      businessUnitsCount: [3, 5, 2, 4, 6][index],
    }));

    const insertedCompanies = await db.insert(companies).values(companyData).returning();
    console.log(`Inserted ${insertedCompanies.length} companies\n`);

    // Create business units for each company
    console.log('Inserting business units...');
    const businessUnitData: Array<{
      companyId: string;
      name: string;
      code: string;
      description: string;
      status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
      phone: string;
      email: string;
      city: string;
      state: string;
      country: string;
      employeesCount: number;
    }> = [];

    const businessUnitTemplates = [
      // Acme Corporation
      [
        { name: 'Headquarters', code: 'HQ', city: 'Bangalore', state: 'Karnataka', employees: 25 },
        { name: 'R&D Center', code: 'RND', city: 'Hyderabad', state: 'Telangana', employees: 15 },
        { name: 'Sales Office', code: 'SALES', city: 'Mumbai', state: 'Maharashtra', employees: 5 },
      ],
      // Globex Industries
      [
        { name: 'Corporate Office', code: 'CORP', city: 'Delhi', state: 'Delhi', employees: 50 },
        { name: 'Manufacturing Plant 1', code: 'MFG1', city: 'Chennai', state: 'Tamil Nadu', employees: 80 },
        { name: 'Manufacturing Plant 2', code: 'MFG2', city: 'Pune', state: 'Maharashtra', employees: 60 },
        { name: 'Warehouse North', code: 'WHN', city: 'Gurgaon', state: 'Haryana', employees: 25 },
        { name: 'Warehouse South', code: 'WHS', city: 'Bangalore', state: 'Karnataka', employees: 15 },
      ],
      // Initech Solutions
      [
        { name: 'Main Office', code: 'MAIN', city: 'Noida', state: 'Uttar Pradesh', employees: 20 },
        { name: 'Development Center', code: 'DEV', city: 'Bangalore', state: 'Karnataka', employees: 8 },
      ],
      // Umbrella Healthcare
      [
        { name: 'Central Hospital', code: 'HOSP', city: 'Mumbai', state: 'Maharashtra', employees: 100 },
        { name: 'Research Lab', code: 'LAB', city: 'Hyderabad', state: 'Telangana', employees: 40 },
        { name: 'Clinic Network', code: 'CLIN', city: 'Bangalore', state: 'Karnataka', employees: 30 },
        { name: 'Pharmacy Distribution', code: 'PHARM', city: 'Chennai', state: 'Tamil Nadu', employees: 10 },
      ],
      // Wayne Enterprises
      [
        { name: 'Wayne Tower', code: 'WT', city: 'Mumbai', state: 'Maharashtra', employees: 200 },
        { name: 'Applied Sciences', code: 'AS', city: 'Bangalore', state: 'Karnataka', employees: 100 },
        { name: 'Aerospace Division', code: 'AERO', city: 'Hyderabad', state: 'Telangana', employees: 80 },
        { name: 'Shipping & Logistics', code: 'SHIP', city: 'Chennai', state: 'Tamil Nadu', employees: 50 },
        { name: 'Medical Division', code: 'MED', city: 'Delhi', state: 'Delhi', employees: 40 },
        { name: 'Energy Research', code: 'ENERGY', city: 'Pune', state: 'Maharashtra', employees: 30 },
      ],
    ];

    insertedCompanies.forEach((company, companyIndex) => {
      const units = businessUnitTemplates[companyIndex];
      units.forEach((unit) => {
        businessUnitData.push({
          companyId: company.id,
          name: unit.name,
          code: unit.code,
          description: `${unit.name} for ${seedTenants[companyIndex].name}`,
          status: 'ACTIVE',
          phone: '+91-' + Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
          email: `${unit.code.toLowerCase()}@${seedTenants[companyIndex].subdomain}.com`,
          city: unit.city,
          state: unit.state,
          country: 'India',
          employeesCount: unit.employees,
        });
      });
    });

    const insertedBusinessUnits = await db.insert(businessUnits).values(businessUnitData).returning();
    console.log(`Inserted ${insertedBusinessUnits.length} business units\n`);

    console.log('Seed completed successfully!');
    console.log('\nSummary:');
    console.log(`- Tenants: ${insertedTenants.length}`);
    console.log(`- Companies: ${insertedCompanies.length}`);
    console.log(`- Business Units: ${insertedBusinessUnits.length}`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
