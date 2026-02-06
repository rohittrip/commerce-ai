import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkProviders() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query(`
      SELECT id, name, enabled, capabilities,
             (SELECT COUNT(*) FROM jsonb_object_keys(tool_configs)) as tool_count
      FROM providers
      ORDER BY id
    `);

    console.log('\n📊 All Providers in Database:\n');
    result.rows.forEach(row => {
      const status = row.enabled ? '✅' : '❌';
      console.log(`${status} ${row.name} (${row.id})`);
      console.log(`   Capabilities: ${JSON.stringify(row.capabilities)}`);
      console.log(`   Tools: ${row.tool_count}`);
      console.log('');
    });

  } finally {
    await pool.end();
  }
}

checkProviders();
