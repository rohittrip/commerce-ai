// Script to sync new tools to database using Node.js pg client
const { Client } = require('pg');

const connectionString = process.env.NODE_DATABASE_URL ||
  'postgresql://postgres:.Qx%23%28~%5B%28_cQLuA6%2B@dev.framasaasai.com:5432/commerce_ai';

const newTools = [
  {
    id: 'commerce.checkout.create',
    display_name: 'Create Checkout Session',
    description: 'Create a checkout session from cart with frozen prices',
    category: 'checkout',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        cartId: { type: 'string' },
        provider: { type: 'string' }
      },
      required: ['userId', 'cartId']
    },
    response_schema: {
      type: 'object',
      properties: {
        checkoutId: { type: 'string' },
        status: { type: 'string' },
        total: { type: 'object' },
        expiresAt: { type: 'string' }
      }
    }
  },
  {
    id: 'commerce.checkout.update',
    display_name: 'Update Checkout Session',
    description: 'Update checkout session with shipping address, billing address, or payment method',
    category: 'checkout',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        checkoutId: { type: 'string' },
        shippingAddress: { type: 'object' },
        billingAddress: { type: 'object' },
        paymentMethod: { type: 'string' }
      },
      required: ['userId', 'checkoutId']
    },
    response_schema: {
      type: 'object',
      properties: {
        checkoutId: { type: 'string' },
        status: { type: 'string' },
        total: { type: 'object' }
      }
    }
  },
  {
    id: 'commerce.checkout.get',
    display_name: 'Get Checkout Session',
    description: 'Retrieve checkout session details including pricing and status',
    category: 'checkout',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        checkoutId: { type: 'string' }
      },
      required: ['userId', 'checkoutId']
    },
    response_schema: {
      type: 'object',
      properties: {
        checkoutId: { type: 'string' },
        status: { type: 'string' },
        total: { type: 'object' }
      }
    }
  },
  {
    id: 'commerce.checkout.complete',
    display_name: 'Complete Checkout',
    description: 'Complete checkout session and create order. High-value orders (>₹50k) require confirmation.',
    category: 'checkout',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        checkoutId: { type: 'string' },
        confirmed: { type: 'boolean' }
      },
      required: ['userId', 'checkoutId']
    },
    response_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        checkoutId: { type: 'string' },
        status: { type: 'string' },
        requiresConfirmation: { type: 'boolean' }
      }
    }
  },
  {
    id: 'commerce.checkout.cancel',
    display_name: 'Cancel Checkout Session',
    description: 'Cancel an active checkout session',
    category: 'checkout',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        checkoutId: { type: 'string' }
      },
      required: ['userId', 'checkoutId']
    },
    response_schema: {
      type: 'object',
      properties: {
        checkoutId: { type: 'string' },
        status: { type: 'string' }
      }
    }
  },
  {
    id: 'commerce.product.estimateShipping',
    display_name: 'Estimate Shipping Cost',
    description: 'Estimate shipping cost and delivery time based on pincode and quantity',
    category: 'product',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'integer' },
        address: {
          type: 'object',
          properties: {
            pincode: { type: 'string' }
          }
        }
      },
      required: ['productId', 'address']
    },
    response_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        shippingCost: { type: 'object' },
        estimatedDeliveryDays: { type: 'integer' }
      }
    }
  },
  {
    id: 'commerce.product.listVariants',
    display_name: 'List Product Variants',
    description: 'Get all available variants of a product with attributes and pricing',
    category: 'product',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' }
      },
      required: ['productId']
    },
    response_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        variants: { type: 'array' },
        totalVariants: { type: 'integer' }
      }
    }
  },
  {
    id: 'commerce.promotions.get',
    display_name: 'Get Active Promotions',
    description: 'Get all active promotions for a product',
    category: 'promotions',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' }
      },
      required: ['productId']
    },
    response_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        promotions: { type: 'array' },
        activePromotions: { type: 'integer' }
      }
    }
  },
  {
    id: 'commerce.promotions.validateCoupon',
    display_name: 'Validate Coupon Code',
    description: 'Validate a coupon code and calculate discount amount',
    category: 'promotions',
    enabled: true,
    request_schema: {
      type: 'object',
      properties: {
        couponCode: { type: 'string' },
        orderAmount: { type: 'number' }
      },
      required: ['couponCode', 'orderAmount']
    },
    response_schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        couponCode: { type: 'string' },
        discount: { type: 'object' }
      }
    }
  }
];

async function syncTools() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    for (const tool of newTools) {
      const result = await client.query(`
        INSERT INTO ucp_tools (
          id, display_name, description, category, enabled,
          request_schema, response_schema,
          default_timeout_ms, default_retry_count, default_retry_backoff_ms,
          version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 30000, 3, 1000, 1)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          enabled = EXCLUDED.enabled,
          request_schema = EXCLUDED.request_schema,
          response_schema = EXCLUDED.response_schema,
          updated_at = NOW()
        RETURNING id, display_name
      `, [
        tool.id,
        tool.display_name,
        tool.description,
        tool.category,
        tool.enabled,
        JSON.stringify(tool.request_schema),
        JSON.stringify(tool.response_schema)
      ]);

      console.log(`✓ Synced: ${result.rows[0].display_name} (${result.rows[0].id})`);
    }

    // Verify
    const verify = await client.query(`
      SELECT id, display_name, category, enabled
      FROM ucp_tools
      WHERE id LIKE 'commerce.checkout.%'
         OR id LIKE 'commerce.product.%'
         OR id LIKE 'commerce.promotions.%'
      ORDER BY category, id
    `);

    console.log('\n✓ Verification - Tools in database:');
    verify.rows.forEach(row => {
      console.log(`  - [${row.category}] ${row.display_name} (${row.id}) - ${row.enabled ? 'Active' : 'Inactive'}`);
    });

    console.log(`\n✓ Successfully synced ${newTools.length} tools to database!`);
    console.log('✓ Refresh the Admin UI to see the new tools.');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

syncTools();
