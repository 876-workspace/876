import { apiError, apiJson } from '@876/core/api'
import { supportRequestDraftSchema, supportResponseStatus } from '@876/crm'
import type { NextRequest } from 'next/server'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrmSupport } from '@/lib/services/crm-support'

function unauthorized() {
  return apiError(
    { code: 'billing/unauthorized', message: 'Unauthorized.' },
    { status: 401 }
  )
}

export async function GET() {
  const context = await getWorkspaceContext()
  if (!context) return unauthorized()

  const result = await getCrmSupport().requests.list(context.orgId)
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContext()
  if (!context) return unauthorized()

  const parsed = supportRequestDraftSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError(
      {
        code: 'billing/invalid-request',
        message: 'The support request is invalid.',
      },
      { status: 400 }
    )

  const result = await getCrmSupport().requests.create({
    ...parsed.data,
    sourceOrganizationId: context.orgId,
    // A workspace membership may carry neither display name nor slug, so the
    // organization id is the last resort that keeps the Efesto CRM customer
    // identifiable rather than unnamed.
    sourceOrganizationName: context.orgName ?? context.orgSlug ?? context.orgId,
    requesterUserId: context.userId,
  })
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
