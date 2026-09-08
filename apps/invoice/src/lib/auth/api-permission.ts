import 'server-only'

import { apiError, getError } from '@876/core'

import { canAccess, resolveAccessContext } from './access-context'
import { getInvoiceApiContext } from './api-context'

export type ApiContext =
  | { response: Response; orgId?: undefined; userId?: undefined }
  | { response: null; orgId: string; userId: string }

function errorResponse(
  code: 'auth/no-session' | 'auth/forbidden' | 'error/unavailable'
) {
  const error = getError(code)
  return apiError(error, { status: error.httpStatus })
}

/** Authorizes an Invoice route handler without redirecting the browser. */
export async function requireApiPermission(
  permission: string
): Promise<ApiContext> {
  const context = await getInvoiceApiContext()
  if (!context) return { response: errorResponse('auth/no-session') }

  const outcome = await resolveAccessContext(context.userId, context.orgId)
  if (outcome.status === 'unavailable')
    return { response: errorResponse('error/unavailable') }

  if (!canAccess(outcome.context, permission))
    return { response: errorResponse('auth/forbidden') }

  return { response: null, orgId: context.orgId, userId: context.userId }
}
