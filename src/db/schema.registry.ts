import * as schema from './schema';

// Register the schema with api-sdk via module augmentation
declare module '@vritti/api-sdk' {
  interface SchemaRegistry {
    schema: typeof schema;
  }
}

// Ensure this file is included in compilation
export {};
