import 'server-only'

import { toAppError } from '@876/core'
import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { getError } from '@/lib/errors'
import { resolveFinanceErrorCode } from '@/lib/errors/finance'
import type { FinanceResource } from '@/lib/errors/finance'
import type { ManageContext } from '@/types/auth'

/** Roles allowed to change an organization's finance settings. */
const MANAGE_ROLES = new Set(['admin', 'super-admin'])

/**
 * Authorizes a Couriers finance mutation against the manage context. Only
 * admins and super-admins may change taxes or payment modes.
 */
export async function requireFinanceAccess(orgSlug: string): Promise<{
  context: ManageContext | null
  response: Response | null
}> {
  const context = await getManageContext(orgSlug)
  if (!context)
    return { context: null, response: errorResponse('finance/unauthorized') }
  if (!MANAGE_ROLES.has(context.role))
    return { context: null, response: errorResponse('finance/forbidden') }

  return { context, response: null }
}

/** A malformed finance mutation body, with a resource-specific code. */
export function invalidRequest(code: string) {
  return errorResponse(code)
}

/**
 * Wraps a Billing integration result in the canonical `{ data, error }`
 * envelope. Registered Billing codes pass through unchanged; anything else is
 * normalized to the owning resource's registered unavailable code.
 */
export function resultResponse<T>(
  resource: FinanceResource,
  result: { data: T | null; error: { code: string } | null },
  successStatus: number
) {
  if (!result.error)
    return apiJson(
      { data: result.data, error: null },
      { status: successStatus }
    )

  return errorResponse(resolveFinanceErrorCode(resource, result.error.code))
}

function errorResponse(code: string): Response {
  const error = getError(code)
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}
