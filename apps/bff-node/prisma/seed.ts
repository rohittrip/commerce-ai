import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if RD.in provider already exists
  const existingProvider = await prisma.providers.findUnique({
    where: { id: 'providerA' },
  });

  if (existingProvider) {
    console.log('RD.in provider already exists, updating...');

    await prisma.providers.update({
      where: { id: 'providerA' },
      data: {
        name: 'RD.in',
        type: 'external',
        base_url: 'https://www.reliancedigital.in',
        enabled: true,
        config: {
          timeout: 10000,
          retries: 3,
          auth: {
            type: 'bearer',
            token: 'NjQ1YTA1Nzg3NWQ4YzQ4ODJiMDk2ZjdlOl9fLU80NC00aQ==',
          },
          apiPath: '/ext/raven-api/catalog/v1.0/collections',
        },
        field_mappings: {
          product: {
            id: 'uid',
            name: 'name',
            price: 'price.effective.min',
            brand: 'brand.name',
            image: 'medias[0].url',
            rating: '_custom_meta.averageRating',
            reviewCount: '_custom_meta.reviewsCount',
          },
        },
        capabilities: ['search', 'details'],
        tool_configs: {
          'commerce.searchProducts': {
            enabled: true,
            path: '/ext/raven-api/catalog/v1.0/collections/{collection}/items',
            method: 'GET',
            description: 'Search products on Reliance Digital',
            params: {
              f: 'internal_source:navigation:::page_type:number:::q:{query}',
              page_no: '{page}',
              page_size: '{limit}',
            },
          },
          'commerce.getProductDetails': {
            enabled: true,
            path: '/ext/raven-api/catalog/v1.0/collections/{collection}/items',
            method: 'GET',
            description: 'Get product details from Reliance Digital',
          },
        },
        priority: 4,
        updated_at: new Date(),
      },
    });

    console.log('Updated RD.in provider');
  } else {
    console.log('Creating RD.in provider...');

    await prisma.providers.create({
      data: {
        id: 'providerA',
        name: 'RD.in',
        type: 'external',
        base_url: 'https://www.reliancedigital.in',
        enabled: true,
        config: {
          timeout: 10000,
          retries: 3,
          auth: {
            type: 'bearer',
            token: 'NjQ1YTA1Nzg3NWQ4YzQ4ODJiMDk2ZjdlOl9fLU80NC00aQ==',
          },
          apiPath: '/ext/raven-api/catalog/v1.0/collections',
        },
        field_mappings: {
          product: {
            id: 'uid',
            name: 'name',
            price: 'price.effective.min',
            brand: 'brand.name',
            image: 'medias[0].url',
            rating: '_custom_meta.averageRating',
            reviewCount: '_custom_meta.reviewsCount',
          },
        },
        capabilities: ['search', 'details'],
        tool_configs: {
          'commerce.searchProducts': {
            enabled: true,
            path: '/ext/raven-api/catalog/v1.0/collections/{collection}/items',
            method: 'GET',
            description: 'Search products on Reliance Digital',
            params: {
              f: 'internal_source:navigation:::page_type:number:::q:{query}',
              page_no: '{page}',
              page_size: '{limit}',
            },
          },
          'commerce.getProductDetails': {
            enabled: true,
            path: '/ext/raven-api/catalog/v1.0/collections/{collection}/items',
            method: 'GET',
            description: 'Get product details from Reliance Digital',
          },
        },
        priority: 4,
      },
    });

    console.log('Created RD.in provider');
  }

  // Ensure categories exist
  const electronics = await prisma.categories.upsert({
    where: { id: 'electronics' },
    update: {},
    create: {
      id: 'electronics',
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      icon: 'laptop',
      display_order: 1,
      enabled: true,
    },
  });

  const home = await prisma.categories.upsert({
    where: { id: 'home' },
    update: {},
    create: {
      id: 'home',
      name: 'Home & Kitchen',
      description: 'Home appliances and kitchen items',
      icon: 'home',
      display_order: 3,
      enabled: true,
    },
  });

  console.log('Categories ensured');

  // Link RD.in to categories
  const rdElectronicsLink = await prisma.provider_categories.upsert({
    where: {
      provider_id_category_id: {
        provider_id: 'providerA',
        category_id: 'electronics',
      },
    },
    update: {},
    create: {
      provider_id: 'providerA',
      category_id: 'electronics',
    },
  });

  const rdHomeLink = await prisma.provider_categories.upsert({
    where: {
      provider_id_category_id: {
        provider_id: 'providerA',
        category_id: 'home',
      },
    },
    update: {},
    create: {
      provider_id: 'providerA',
      category_id: 'home',
    },
  });

  console.log('Provider-category links created');
  console.log('✅ RD.in provider seeded successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
