import 'server-only'

import { getInvoiceContextResult } from '@/lib/auth/context'

/**
 * Resolves the entitled Invoice organization behind a support request, or null.
 * Shared by both support routes so the entitlement gate has one definition.
 */
export async function resolveSupportContext() {
  const result = await getInvoiceContextResult()
  if (result.status !== 'ok') return null
  if (
    result.context.accessStatus !== 'active' &&
    result.context.accessStatus !== 'trialing'
  )
    return null
  return result.context
}
