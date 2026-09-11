import { z } from 'zod'

import { listSchema } from './common.schema'
import type { SalesReceipt, SalesReceiptList } from './sales-receipt'

export const SalesReceiptSchema = z
  .strictObject({
    object: z.literal('sales_receipt'),
    id: z.string().min(1),
    number: z.string().min(1),
    status: z.enum(['PAID', 'VOID']),
    currency: z.string().min(1),
    totalAmount: z.string(),
    receiptAt: z.number().int(),
  })
  .passthrough() satisfies z.ZodType<SalesReceipt>

export const SalesReceiptListSchema = listSchema(
  SalesReceiptSchema
) satisfies z.ZodType<SalesReceiptList>
