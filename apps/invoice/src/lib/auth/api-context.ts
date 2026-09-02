import 'server-only'

import { getInvoiceContextResult } from './context'

export async function getInvoiceApiContext() {
  const result = await getInvoiceContextResult()
  if (result.status !== 'ok') return null
  if (
    result.context.accessStatus !== 'active' &&
    result.context.accessStatus !== 'trialing'
  )
    return null
  return result.context
}
