import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
  console.log('🔧 Starting UCP Cleanup Migration...\n');

  // Create database connection from DATABASE_URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../../../infra/docker/migrations/004_fix_tool_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file:', migrationPath);
    console.log('\n▶ Executing migration SQL...\n');

    // Execute the entire migration as a single transaction
    const result = await pool.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify results
    console.log('📊 Verification:\n');

    const categoriesResult = await pool.query(`
      SELECT category, COUNT(*) as count, array_agg(display_name) as tools
      FROM ucp_tools
      GROUP BY category
      ORDER BY category
    `);

    console.log('Tool Categories:');
    categoriesResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} tools`);
    });

    const providersResult = await pool.query(`
      SELECT id, name, capabilities, jsonb_object_keys(tool_configs) as tool_keys
      FROM providers
      WHERE enabled = true
    `);

    console.log('\nActive Providers:');
    providersResult.rows.forEach(row => {
      console.log(`  ${row.id} (${row.name}): ${JSON.stringify(row.capabilities)}`);
    });

    console.log('\n✓ Migration verification complete!');
    console.log('\nNext steps:');
    console.log('1. Restart the BFF Node service');
    console.log('2. Rebuild the Java MCP server: cd services-java/mcp-tool-server && mvn clean package');
    console.log('3. Restart all services');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
