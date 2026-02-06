// Quick script to update mock provider capabilities
const DATABASE_URL = "postgresql://postgres:.Qx%23%28~%5B%28_cQLuA6%2B@dev.framasaasai.com:5432/commerce_ai";

async function updateMockProvider() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    // Update mock provider capabilities
    const result = await client.query(`
      UPDATE providers
      SET capabilities = ARRAY['SEARCH', 'DETAILS', 'CART', 'ORDER']
      WHERE id = 'mock'
      RETURNING id, name, capabilities
    `);

    console.log('✓ Mock provider updated:');
    console.log(result.rows[0]);

    // Verify
    const verify = await client.query("SELECT id, name, capabilities FROM providers WHERE id = 'mock'");
    console.log('✓ Verified capabilities:', verify.rows[0].capabilities);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

updateMockProvider();
