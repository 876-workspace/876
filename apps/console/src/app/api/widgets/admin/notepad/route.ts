import { apiError, apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $widgetsAdmin } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const url = new URL(request.url)
  const result = await $widgetsAdmin.notes.list(
    { userId: access.sessionUser.id },
    {
      owner_account_id: url.searchParams.get('owner_account_id') ?? undefined,
      limit: Number(url.searchParams.get('limit') ?? '') || undefined,
      starting_after: url.searchParams.get('starting_after') ?? undefined,
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
