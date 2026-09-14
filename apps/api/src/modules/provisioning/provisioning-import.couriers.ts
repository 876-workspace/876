export type CouriersPackageCategoryDefault = {
  key: string
  name: string
  description: string | null
  sortOrder: number
}

/**
 * Bootstrap defaults for the 876 Couriers application manifest.
 *
 * These values are used only to build the one-time application provisioning
 * manifest. After import, the database-backed published manifest is the source
 * of truth and tenant reconciliation preserves local edits.
 */
export const COURIERS_PACKAGE_CATEGORY_DEFAULTS: readonly CouriersPackageCategoryDefault[] = [
  {
    key: 'apparel-clothing',
    name: 'Apparel & Clothing',
    description: 'Clothing, garments, and apparel.',
    sortOrder: 10,
  },
  {
    key: 'footwear',
    name: 'Footwear',
    description: 'Shoes, sandals, boots, and other footwear.',
    sortOrder: 20,
  },
  {
    key: 'fashion-accessories',
    name: 'Fashion Accessories',
    description: 'Bags, jewelry, watches, and fashion accessories.',
    sortOrder: 30,
  },
  {
    key: 'electronics',
    name: 'Electronics',
    description: 'Consumer electronics and electronic accessories.',
    sortOrder: 40,
  },
  {
    key: 'phones-accessories',
    name: 'Phones & Accessories',
    description: 'Mobile phones, cases, chargers, and phone accessories.',
    sortOrder: 50,
  },
  {
    key: 'computers-accessories',
    name: 'Computers & Accessories',
    description: 'Computers, components, peripherals, and accessories.',
    sortOrder: 60,
  },
  {
    key: 'appliances',
    name: 'Appliances',
    description: 'Household and small appliances.',
    sortOrder: 70,
  },
  {
    key: 'health-supplements',
    name: 'Health & Supplements',
    description: 'Health products, vitamins, and dietary supplements.',
    sortOrder: 80,
  },
  {
    key: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    description: 'Cosmetics, grooming, and personal care products.',
    sortOrder: 90,
  },
  {
    key: 'medical-supplies',
    name: 'Medical Supplies',
    description: 'Medical devices, supplies, and related equipment.',
    sortOrder: 100,
  },
  {
    key: 'home-kitchen',
    name: 'Home & Kitchen',
    description: 'Home goods, kitchenware, and household furnishings.',
    sortOrder: 110,
  },
  {
    key: 'household',
    name: 'Household',
    description: 'General household supplies and consumables.',
    sortOrder: 120,
  },
  {
    key: 'furniture',
    name: 'Furniture',
    description: 'Indoor and outdoor furniture.',
    sortOrder: 130,
  },
  {
    key: 'sports-fitness',
    name: 'Sports & Fitness',
    description: 'Sporting goods, exercise equipment, and fitness accessories.',
    sortOrder: 140,
  },
  {
    key: 'toys-games',
    name: 'Toys & Games',
    description: 'Toys, games, hobby products, and recreational items.',
    sortOrder: 150,
  },
  {
    key: 'baby-kids',
    name: 'Baby & Kids',
    description: 'Baby products and children’s goods.',
    sortOrder: 160,
  },
  {
    key: 'automotive',
    name: 'Automotive',
    description: 'Vehicle parts, accessories, and automotive supplies.',
    sortOrder: 170,
  },
  {
    key: 'tools-hardware',
    name: 'Tools & Hardware',
    description: 'Tools, hardware, and home-improvement supplies.',
    sortOrder: 180,
  },
  {
    key: 'office-school',
    name: 'Office & School',
    description: 'Office, stationery, and school supplies.',
    sortOrder: 190,
  },
  {
    key: 'food-grocery',
    name: 'Food & Grocery',
    description: 'Packaged food, grocery, and pantry items.',
    sortOrder: 200,
  },
  {
    key: 'pet-supplies',
    name: 'Pet Supplies',
    description: 'Pet food, accessories, and animal-care supplies.',
    sortOrder: 210,
  },
  {
    key: 'books-media',
    name: 'Books & Media',
    description: 'Books, printed media, music, movies, and physical media.',
    sortOrder: 220,
  },
  {
    key: 'documents-mail',
    name: 'Documents & Mail',
    description: 'Documents, correspondence, and other paper mail.',
    sortOrder: 230,
  },
  {
    key: 'business-industrial',
    name: 'Business & Industrial',
    description: 'Business, commercial, and industrial goods.',
    sortOrder: 240,
  },
  {
    key: 'personal-items',
    name: 'Personal Items',
    description: 'Personal effects that do not fit a more specific category.',
    sortOrder: 250,
  },
  {
    key: 'other',
    name: 'Other',
    description: 'Packages that do not fit another configured category.',
    sortOrder: 260,
  },
]
