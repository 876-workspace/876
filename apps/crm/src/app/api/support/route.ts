import { apiError, apiJson } from '@876/core/api'
import { supportRequestDraftSchema, supportResponseStatus } from '@876/crm'
import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { getCrmSupport } from '@/lib/services/crm-support'

function unauthorized() {
  return apiError(
    { code: 'crm/unauthorized', message: 'Unauthorized.' },
    { status: 401 }
  )
}

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const result = await getCrmSupport().requests.list(context.orgId)
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const parsed = supportRequestDraftSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError(
      {
        code: 'crm/invalid-request',
        message: 'The support request is invalid.',
      },
      { status: 400 }
    )

  const result = await getCrmSupport().requests.create({
    ...parsed.data,
    sourceOrganizationId: context.orgId,
    sourceOrganizationName: context.orgName,
    requesterUserId: context.userId,
  })
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
