import type { Vendor } from '@/db'

import type { VendorResource } from './vendors.schemas'

export function serializeVendor(row: Vendor): VendorResource {
  return {
    object: 'vendor',
    id: row.id,
    externalReference: row.externalReference,
    name: row.name,
    email: row.email,
    phone: row.phone,
    billingAddress: row.billingAddress,
    metadata: row.metadata,
    defaultCurrency: row.defaultCurrency,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
