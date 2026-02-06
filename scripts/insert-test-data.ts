import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_DATABASE_URL
    }
  }
});

async function insertTestData() {
  try {
    // Insert coupons
    await prisma.$executeRaw`
      INSERT INTO coupons (code, type, value, min_order, max_discount, expires_at, enabled, description)
      VALUES
        ('WINTER2026', 'PERCENTAGE', 10, 1000, 500, NOW() + INTERVAL '30 days', true, 'Winter Sale - 10% off on orders above ₹1000'),
        ('FLAT100', 'FIXED_AMOUNT', 100, 500, NULL, NOW() + INTERVAL '15 days', true, 'Flat ₹100 off on orders above ₹500'),
        ('MEGA50', 'PERCENTAGE', 50, 5000, 2000, NOW() + INTERVAL '7 days', true, 'Mega Sale - 50% off on orders above ₹5000')
      ON CONFLICT (code) DO NOTHING
    `;

    console.log('✓ Test coupons inserted');

    // Check if test data was inserted
    const coupons = await prisma.$queryRaw`SELECT code, type, value FROM coupons WHERE code IN ('WINTER2026', 'FLAT100', 'MEGA50')`;
    console.log('✓ Verified coupons:', coupons);

  } catch (error) {
    console.error('Error inserting test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

insertTestData();
