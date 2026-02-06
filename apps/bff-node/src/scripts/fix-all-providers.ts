import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixAllProviders() {
  console.log('🔧 Fixing all provider tool configs...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get all providers (both enabled and disabled)
    const providersResult = await pool.query(`
      SELECT id, name, tool_configs, enabled
      FROM providers
    `);

    console.log(`Found ${providersResult.rows.length} providers\n`);

    // Define all available UCP tools from ucp_tools table
    const allToolsResult = await pool.query(`
      SELECT id, category, enabled
      FROM ucp_tools
      WHERE enabled = true AND category = 'commerce'
      ORDER BY id
    `);

    console.log(`Found ${allToolsResult.rows.length} enabled commerce tools in ucp_tools table\n`);

    const allCommerceTools = allToolsResult.rows.map(row => row.id);
    console.log('Available commerce tools:', allCommerceTools);

    // Update each provider to have all commerce tools
    for (const provider of providersResult.rows) {
      const status = provider.enabled ? '✅' : '⚠️ ';
      console.log(`\n📦 Updating provider: ${provider.name} (${provider.id}) ${status}`);

      // Build tool_configs with all commerce tools enabled
      const toolConfigs: Record<string, { enabled: boolean }> = {};

      for (const toolId of allCommerceTools) {
        toolConfigs[toolId] = { enabled: true };
      }

      // Update the provider
      await pool.query(`
        UPDATE providers
        SET tool_configs = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(toolConfigs), provider.id]);

      console.log(`  ✓ Updated with ${Object.keys(toolConfigs).length} tools`);
    }

    console.log('\n✅ All providers updated successfully!\n');

    // Verify the results
    const verifyResult = await pool.query(`
      SELECT
        id,
        name,
        jsonb_object_keys(tool_configs) as tool_id
      FROM providers
      ORDER BY id, tool_id
    `);

    console.log('📊 Verification - Tools per provider:');

    const providerToolCounts: Record<string, number> = {};
    verifyResult.rows.forEach(row => {
      if (!providerToolCounts[row.id]) {
        providerToolCounts[row.id] = 0;
      }
      providerToolCounts[row.id]++;
    });

    Object.entries(providerToolCounts).forEach(([id, count]) => {
      const provider = providersResult.rows.find(p => p.id === id);
      console.log(`  ${provider?.name} (${id}): ${count} tools`);
    });

  } catch (error: any) {
    console.error('❌ Failed to fix providers:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllProviders();
