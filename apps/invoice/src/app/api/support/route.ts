import type { NextRequest } from 'next/server'

import { supportRequestDraftSchema } from '@876/crm'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { getCrmSupport } from '@/lib/services/crm-support'

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'invoice/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

function statusFor(errorCode: string | undefined, success: number) {
  if (!errorCode) return success
  return errorCode === 'crm/not-configured' ? 503 : 502
}

async function supportContext() {
  const result = await getInvoiceContextResult()
  if (result.status !== 'ok') return null
  if (
    result.context.accessStatus !== 'active' &&
    result.context.accessStatus !== 'trialing'
  )
    return null
  return result.context
}

export async function GET() {
  const context = await supportContext()
  if (!context) return unauthorized()

  const result = await getCrmSupport().requests.list(context.orgId)
  return Response.json(result, {
    status: statusFor(result.error?.code, 200),
  })
}

export async function POST(request: NextRequest) {
  const context = await supportContext()
  if (!context) return unauthorized()

  const parsed = supportRequestDraftSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return Response.json(
      {
        data: null,
        error: {
          code: 'invoice/invalid-request',
          message: 'The support request is invalid.',
        },
      },
      { status: 400 }
    )

  const result = await getCrmSupport().requests.create({
    ...parsed.data,
    sourceOrganizationId: context.orgId,
    sourceOrganizationName: context.orgName,
    requesterUserId: context.userId,
  })
  return Response.json(result, {
    status: statusFor(result.error?.code, 201),
  })
}
