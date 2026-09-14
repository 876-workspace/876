import 'server-only'

import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import type { ManageContext } from '@/types/auth'

export async function requireRequestAccess(orgSlug: string): Promise<{
  context: ManageContext | null
  response: Response | null
}> {
  const context = await getManageContext(orgSlug)
  if (!context || context.role === 'staff')
    return {
      context: null,
      response: errorResponse('auth/forbidden'),
    }

  return { context, response: null }
}

export function invalidRequest() {
  return errorResponse('crm/invalid-request')
}

export function resultResponse<T>(
  result: { data: T | null; error: { code: string } | null },
  successStatus: number
) {
  const error = result.error
    ? getError(
        result.error.code.startsWith('crm/')
          ? result.error.code
          : 'crm/internal'
      )
    : null

  return apiJson(
    {
      data: result.data,
      error: error ? toAppError(error) : null,
    },
    { status: error?.httpStatus ?? successStatus }
  )
}

function errorResponse(code: string) {
  const error = getError(code)
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}
