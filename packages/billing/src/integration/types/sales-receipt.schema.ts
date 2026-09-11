import { z } from 'zod'

import { listSchema } from '../../types/common.schema'
import type {
  BillingSalesReceipt,
  BillingSalesReceiptList,
} from './sales-receipt'

export const BillingSalesReceiptSchema = z
  .strictObject({ object: z.literal('sales_receipt'), id: z.string().min(1) })
  .passthrough() satisfies z.ZodType<BillingSalesReceipt>

export const BillingSalesReceiptListSchema = listSchema(
  BillingSalesReceiptSchema
) satisfies z.ZodType<BillingSalesReceiptList>
