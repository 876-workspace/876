import { Request } from '../request'
import type { Runtime } from '../runtime'
import { CreditNoteListSchema, CreditNoteSchema } from '../schemas'
import type {
  CreditNote,
  CreditNoteApplyParams,
  CreditNoteCreateParams,
  CreditNoteList,
  CreditNoteListParams,
  RequestOptions,
} from '../types'

/** `$876.billing.creditNotes.*` — tenant-scoped credit-note operations. */
export function createCreditNotesResource(runtime: Runtime) {
  return {
    /** Lists credit notes in the active Billing workspace. */
    list(params: CreditNoteListParams = {}, options?: RequestOptions) {
      return Request<CreditNoteList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/credit-notes',
          query: params as Record<
            string,
            string | number | boolean | undefined
          >,
          signal: options?.signal,
        },
        CreditNoteListSchema
      )
    },
    /** Creates a credit note in the active Billing workspace. */
    create(params: CreditNoteCreateParams, options?: RequestOptions) {
      return Request<CreditNote>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/credit-notes',
          body: params,
          signal: options?.signal,
        },
        CreditNoteSchema
      )
    },
    /** Applies a credit note to one or more invoices. */
    apply(
      creditNoteId: string,
      params: CreditNoteApplyParams,
      options?: RequestOptions
    ) {
      return Request<CreditNote>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/credit-notes/${encodeURIComponent(creditNoteId)}/apply`,
          body: params,
          signal: options?.signal,
        },
        CreditNoteSchema
      )
    },
    /** Voids an open or closed credit note. */
    void(creditNoteId: string, options?: RequestOptions) {
      return Request<CreditNote>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/credit-notes/${encodeURIComponent(creditNoteId)}/void`,
          body: {},
          signal: options?.signal,
        },
        CreditNoteSchema
      )
    },
  }
}
