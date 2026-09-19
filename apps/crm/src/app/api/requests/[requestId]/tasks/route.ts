import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/clients/crm'
import type { CrmRequestTaskCreateInput } from '@/types/crm'

type Context = { params: Promise<{ requestId: string }> }
function statusFor(code: string | undefined) {
  if (code === 'crm/request-not-found') return 404
  return 400
}
function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId } = await route.params
  const result = await crm.requestTasks.list(context.orgId, requestId)
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function POST(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId } = await route.params
  const input = (await request.json().catch(() => null)) as Partial<
    Omit<CrmRequestTaskCreateInput, 'createdBy'>
  > | null
  const title = input?.title?.trim()
  if (!title)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/invalid-body', message: 'A task needs a title.' },
      },
      { status: 400 }
    )
  const result = await crm.requestTasks.create(context.orgId, requestId, {
    ...input,
    title,
    createdBy: context.userId,
  })
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 201,
  })
}
