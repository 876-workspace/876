import { z } from 'zod'

import type { CreditNote, CreditNoteList } from './credit-note'
import { listSchema } from './common.schema'

/** The schema for one tenant credit note. */
export const CreditNoteSchema = z
  .strictObject({ object: z.literal('credit_note'), id: z.string().min(1) })
  .passthrough() satisfies z.ZodType<CreditNote>

/** The schema for a paginated list of credit notes. */
export const CreditNoteListSchema = listSchema(
  CreditNoteSchema
) satisfies z.ZodType<CreditNoteList>
