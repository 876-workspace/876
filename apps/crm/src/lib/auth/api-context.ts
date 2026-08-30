import 'server-only'

import { getCrmContextResult } from './context'

export async function getCrmApiContext() {
  const result = await getCrmContextResult()
  if (result.status !== 'ok') return null
  if (
    result.context.accessStatus !== 'active' &&
    result.context.accessStatus !== 'trialing'
  )
    return null
  return result.context
}
