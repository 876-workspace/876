import 'server-only'

import type { Invoice } from '@876/billing'
import { getError } from '@876/core'
import { workResourceRefSchema, type WorkHostContext } from '@876/work'

import { workErrorResponse } from '@/lib/api/work-response'
import { getBilling } from '@/lib/services/billing'

import { requireApiPermission } from './api-permission'

const INVOICE_CONTEXT_SERVICE = 'billing'
const INVOICE_CONTEXT_RESOURCE = 'invoice'

type AuthorizedApiContext = {
  orgId: string
  userId: string
}

type WorkContextResult =
  | { context: WorkHostContext | null; response: null }
  | { context: null; response: Response }

function errorResult(
  code:
    | 'auth/forbidden'
    | 'error/unavailable'
    | 'work/invalid-request'
    | 'work/not-found'
): WorkContextResult {
  return { context: null, response: workErrorResponse(getError(code)) }
}

export function createInvoiceWorkContext(
  invoice: Pick<Invoice, 'id' | 'number'>
): WorkHostContext {
  const rawNumber = invoice.number
  const label =
    typeof rawNumber === 'string' && rawNumber.trim().length > 0
      ? rawNumber.trim()
      : invoice.id

  return workResourceRefSchema.parse({
    service: INVOICE_CONTEXT_SERVICE,
    resource: INVOICE_CONTEXT_RESOURCE,
    externalId: invoice.id,
    label,
    url: `/invoices/${encodeURIComponent(invoice.id)}`,
  })
}

/**
 * Re-authorizes the invoice named by the host route before contextual Work I/O.
 * The returned label and URL always come from the Billing-owned invoice.
 */
export async function requireAuthorizedInvoiceWorkContext(
  invoiceId: string,
  auth: AuthorizedApiContext
): Promise<WorkContextResult> {
  if (!invoiceId.trim()) return errorResult('work/invalid-request')

  const hostAccess = await requireApiPermission('invoices.view')
  if (hostAccess.response)
    return { context: null, response: hostAccess.response }
  if (hostAccess.orgId !== auth.orgId || hostAccess.userId !== auth.userId)
    return errorResult('auth/forbidden')

  const billing = await getBilling(auth.orgId)
  const invoice = await billing.invoices.retrieve(invoiceId)
  if (invoice.error)
    return errorResult(
      invoice.error.code === 'invoice/not-found'
        ? 'work/not-found'
        : 'error/unavailable'
    )

  return {
    context: createInvoiceWorkContext(invoice.data),
    response: null,
  }
}
