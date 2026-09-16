import { apiError, apiJson } from '@876/core/api'
import { createEmailDomainSchema } from '@876/communications/contracts'
import type { NextRequest } from 'next/server'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { communicationsService } from '@/lib/services/communications'

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContext()
  if (!context)
    return apiError(
      { code: 'billing/unauthorized', message: 'Unauthorized.' },
      { status: 401 }
    )

  const parsed = createEmailDomainSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError(
      { code: 'billing/invalid-request', message: 'Invalid request body.' },
      { status: 400 }
    )

  const result = await communicationsService().domains.create(
    context.orgId,
    parsed.data
  )
  return apiJson(result, { status: result.error ? 502 : 201 })
}
