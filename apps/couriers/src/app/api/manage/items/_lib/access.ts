import 'server-only'

import { toAppError } from '@876/core'
import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { getError } from '@/lib/errors'
import { resolveItemErrorCode } from '@/lib/errors/item'
import type { ManageContext } from '@/types/auth'

const MANAGE_ROLES = new Set(['admin', 'super-admin'])

export async function requireItemAccess(
  orgSlug: string
): Promise<{ context: ManageContext | null; response: Response | null }> {
  const context = await getManageContext(orgSlug)
  if (!context)
    return { context: null, response: errorResponse('item/unauthorized') }
  if (!MANAGE_ROLES.has(context.role))
    return { context: null, response: errorResponse('item/forbidden') }
  return { context, response: null }
}

export function invalidItemRequest() {
  return errorResponse('item/invalid')
}

export function itemResultResponse<T>(
  result: { data: T | null; error: { code: string } | null },
  status: number
) {
  if (!result.error)
    return apiJson({ data: result.data, error: null }, { status })
  return errorResponse(resolveItemErrorCode(result.error.code))
}

function errorResponse(code: string) {
  const error = getError(code)
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}
