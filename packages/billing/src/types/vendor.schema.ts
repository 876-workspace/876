import { z } from 'zod'

import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
import type { Vendor, VendorCreated, VendorDeleted } from './vendor'

const vendorStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

/** The schema for a vendor resource returned after a write. */
export const VendorCreatedSchema = createdResourceSchema(
  'vendor'
) satisfies z.ZodType<VendorCreated>

/** The schema for a deleted vendor tombstone. */
export const VendorDeletedSchema = deletedResourceSchema(
  'vendor'
) satisfies z.ZodType<VendorDeleted>

/** The schema for a vendor. Mirrors the Billing API's `vendorSchema`. */
export const VendorSchema = z.strictObject({
  object: z.literal('vendor'),
  id: z.string().min(1),
  externalReference: z.string().nullable(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  billingAddress: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  defaultCurrency: z.string().nullable(),
  status: vendorStatusSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Vendor>

/** The schema for a list of vendors. */
export const VendorListSchema = listSchema(VendorSchema) satisfies z.ZodType<
  List<Vendor>
>
