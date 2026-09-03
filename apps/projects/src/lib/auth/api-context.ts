import 'server-only'

import { getProjectsContextResult } from './context'

export async function getProjectsApiContext() {
  const result = await getProjectsContextResult()
  if (result.status !== 'ok') return null
  if (
    result.context.accessStatus !== 'active' &&
    result.context.accessStatus !== 'trialing'
  )
    return null
  return result.context
}
