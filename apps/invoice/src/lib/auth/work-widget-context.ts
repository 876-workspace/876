import 'server-only'

import type { Invoice } from '@876/billing'
import { getError } from '@876/core'
import {
  workResourceRefSchema,
  type WorkHostContext,
} from '@876/work'

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
  code: 'auth/forbidden' | 'error/unavailable' | 'work/invalid-request' | 'work/not-found'
): WorkContextResult {
  return { context: null, response: workErrorResponse(getError(code)) }
}

export function createInvoiceWorkContext(
  invoice: Pick<Invoice, 'id' | 'number'>
): WorkHostContext {
  return workResourceRefSchema.parse({
    service: INVOICE_CONTEXT_SERVICE,
    resource: INVOICE_CONTEXT_RESOURCE,
    externalId: invoice.id,
    label: String(invoice.number ?? invoice.id),
    url: `/invoices/${encodeURIComponent(invoice.id)}`,
  })
}

function requestedContext(request: Request): WorkHostContext | null | Response {
  const params = new URL(request.url).searchParams
  const service = params.get('contextService')
  const resource = params.get('contextResource')
  const externalId = params.get('contextId')
  const supplied = [service, resource, externalId].filter(
    (value) => value !== null
  ).length

  if (supplied === 0) return null
  if (supplied !== 3)
    return workErrorResponse(getError('work/invalid-request'))

  const parsed = workResourceRefSchema.safeParse({
    service,
    resource,
    externalId,
  })
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))
  if (
    parsed.data.service !== INVOICE_CONTEXT_SERVICE ||
    parsed.data.resource !== INVOICE_CONTEXT_RESOURCE
  )
    return workErrorResponse(getError('work/invalid-request'))

  return parsed.data
}

/**
 * Re-authorizes browser-requested host context before any contextual Work I/O.
 * The returned label and URL always come from the Billing-owned invoice.
 */
export async function requireAuthorizedWorkWidgetContext(
  request: Request,
  auth: AuthorizedApiContext
): Promise<WorkContextResult> {
  const requested = requestedContext(request)
  if (requested instanceof Response)
    return { context: null, response: requested }
  if (!requested) return { context: null, response: null }

  const hostAccess = await requireApiPermission('invoices.view')
  if (hostAccess.response)
    return { context: null, response: hostAccess.response }
  if (hostAccess.orgId !== auth.orgId || hostAccess.userId !== auth.userId)
    return errorResult('auth/forbidden')

  const billing = await getBilling(auth.orgId)
  const invoice = await billing.invoices.retrieve(requested.externalId)
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
