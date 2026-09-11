import { z } from 'zod'

import { listSchema } from './common.schema'
import type { SalesReceipt, SalesReceiptList } from './sales-receipt'

export const SalesReceiptSchema = z
  .strictObject({ object: z.literal('sales_receipt'), id: z.string().min(1) })
  .passthrough() satisfies z.ZodType<SalesReceipt>

export const SalesReceiptListSchema = listSchema(
  SalesReceiptSchema
) satisfies z.ZodType<SalesReceiptList>
