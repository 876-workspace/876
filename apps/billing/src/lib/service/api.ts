import 'server-only'

import { create876BillingServerClient } from '@876/billing/server'
import { cookies, headers } from 'next/headers'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface BillingApiRequest {
  credential?: 'internal' | 'user'
  method?: HttpMethod
  path: string
  body?: unknown
  organizationId?: string
  query?: Record<string, boolean | number | string | undefined>
}

/** A client-safe failure returned by the Billing data plane. */
export class BillingApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'BillingApiError'
    this.code = code
    this.status = status
  }
}

/**
 * Sends an authenticated server-side request to the Billing data plane.
 *
 * This is the compatibility transport for the old `service.*` facade. It
 * deliberately resolves authentication per call so no user's token or active
 * organization can leak through process-wide module state.
 */
export async function billingApiRequest(
  request: BillingApiRequest
): Promise<unknown> {
  const credential = request.credential ?? 'user'
  const session = credential === 'user' ? await getAuthSession() : null
  const accessToken =
    session && isSignedSession(session) ? session.accessToken : undefined
  const internalKey =
    process.env.BILLING_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY
  if (credential === 'user' && !accessToken)
    throw new BillingApiError(
      'auth/missing-credential',
      'Billing authentication is required.',
      401
    )
  if (credential === 'internal' && !internalKey)
    throw new BillingApiError(
      'auth/missing-credential',
      'Billing internal authentication is not configured.',
      503
    )

  const organizationId =
    request.organizationId ??
    (await cookies()).get('billing_active_org')?.value ??
    (session && isSignedSession(session) ? session.user.orgId : null) ??
    undefined
  const requestId = (await headers()).get('x-request-id') ?? undefined
  const client = create876BillingServerClient({
    baseUrl: process.env.BILLING_API_URL,
    requestId,
    ...(credential === 'user'
      ? { accessToken: accessToken as string, organizationId }
      : { internalKey: internalKey as string }),
  })
  const result = await client.request({
    method: request.method ?? 'GET',
    path: request.path,
    body: request.body,
    query: request.query,
  })
  if (result.error)
    throw new BillingApiError(result.error.code, result.error.message, 502)

  return rehydrateMoney(result.data)
}

const MoneyFields = new Set([
  'amount',
  'amountApplied',
  'amountCredited',
  'amountDue',
  'amountOff',
  'amountPaid',
  'arr',
  'bankCharges',
  'balance',
  'discountAmount',
  'mrr',
  'outstandingReceivable',
  'setupFeeAmount',
  'subtotalAmount',
  'taxAmount',
  'totalAmount',
  'totalIssued',
  'totalOutstanding',
  'unappliedAmount',
  'unitAmount',
  'unusedCredits',
])

/** Restores the BigInt values the former in-process Prisma facade returned. */
function rehydrateMoney(value: unknown, field?: string): unknown {
  if (
    field &&
    MoneyFields.has(field) &&
    typeof value === 'string' &&
    /^-?\d+$/.test(value)
  )
    return BigInt(value)

  if (Array.isArray(value)) return value.map((item) => rehydrateMoney(item))

  if (typeof value !== 'object' || value === null) return value

  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      rehydrateMoney(item, name),
    ])
  )
}
