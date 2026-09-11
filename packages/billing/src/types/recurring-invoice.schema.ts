import { z } from 'zod'
import type {
  DeletedRecurringInvoice,
  RecurringInvoice,
  RecurringInvoiceList,
} from './recurring-invoice'
import { listSchema } from './common.schema'

export const RecurringInvoiceSchema = z
  .strictObject({
    object: z.literal('recurring-invoice'),
    id: z.string().min(1),
  })
  .passthrough() satisfies z.ZodType<RecurringInvoice>
export const RecurringInvoiceListSchema = listSchema(
  RecurringInvoiceSchema
) satisfies z.ZodType<RecurringInvoiceList>
export const DeletedRecurringInvoiceSchema = z.strictObject({
  object: z.literal('recurring-invoice'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedRecurringInvoice>
