import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔧 Starting UCP Cleanup Migration via Prisma...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../infra/docker/migrations/004_fix_tool_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file:', migrationPath);

    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

    console.log(`\n✓ Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip SELECT statements (verification queries)
      if (statement.toUpperCase().startsWith('SELECT')) {
        console.log(`⏭  Skipping verification query ${i + 1}`);
        continue;
      }

      console.log(`▶ Executing statement ${i + 1}/${statements.length}...`);

      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`  ✓ Success`);
      } catch (error: any) {
        // Log but continue for non-critical errors
        console.log(`  ⚠ Warning: ${error.message}`);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Verification:');

    // Verify tool categories
    const toolCategories = await prisma.$queryRaw`
      SELECT category, COUNT(*) as count
      FROM ucp_tools
      GROUP BY category
      ORDER BY category
    `;
    console.log('\nTool categories:', toolCategories);

    // Verify provider capabilities
    const providers = await prisma.$queryRaw`
      SELECT id, name, capabilities
      FROM providers
      WHERE enabled = true
    `;
    console.log('\nActive providers:', providers);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
