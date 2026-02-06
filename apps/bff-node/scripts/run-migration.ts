import { readFileSync } from 'fs';
import { Pool } from 'pg';
import * as path from 'path';

async function runMigration() {
  const pool = new Pool({
    host: 'dev.framasaasai.com',
    port: 5432,
    database: 'commerce_ai',
    user: 'postgres',
    password: '.Qx#(~[(_cQLuA6+',
  });

  try {
    const migrationPath = path.join(__dirname, '../../../infra/docker/migration-001-add-providers.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Running migration: Add providers table...');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
