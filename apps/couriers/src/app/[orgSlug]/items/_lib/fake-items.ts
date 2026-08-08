import type { ItemTableRow } from '../_components/items-table'

/** Frontend-only preview data for workspaces without catalog items yet. */
export const FAKE_ITEMS: ItemTableRow[] = [
  {
    id: 'fake-item-1',
    name: 'Package Handling',
    imageUrl: null,
    sku: 'PKG-HANDLING',
    priceLabel: 'JMD 750.00',
    description: 'Receiving and handling of incoming packages.',
  },
  {
    id: 'fake-item-2',
    name: 'International Shipping',
    imageUrl: null,
    sku: 'INTL-SHIPPING',
    priceLabel: 'JMD 2,500.00',
    description: 'Standard international package shipping.',
  },
  {
    id: 'fake-item-3',
    name: 'Package Storage',
    imageUrl: null,
    sku: 'PKG-STORAGE',
    priceLabel: 'JMD 500.00',
    description: 'Weekly storage for packages awaiting pickup.',
  },
  {
    id: 'fake-item-4',
    name: 'Mailbox Rental',
    imageUrl: null,
    sku: 'MAILBOX-RENTAL',
    priceLabel: 'JMD 1,000.00',
    description: 'Monthly rental of a personal courier mailbox.',
  },
  {
    id: 'fake-item-5',
    name: 'Customs Processing',
    imageUrl: null,
    sku: 'CUSTOMS-PROCESSING',
    priceLabel: 'JMD 1,250.00',
    description: 'Customs documentation and processing service.',
  },
]
