import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'
import type { CrmRequestTaskUpdateInput } from '@/types/crm'

type Context = { params: Promise<{ requestId: string; taskId: string }> }
function statusFor(code: string | undefined) {
  if (code === 'crm/request-not-found' || code === 'crm/task-not-found')
    return 404
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

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId, taskId } = await route.params
  const input = (await request.json().catch(() => null)) as Omit<
    CrmRequestTaskUpdateInput,
    'completedBy'
  > | null
  if (!input || Object.keys(input).length === 0)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/invalid-body', message: 'Nothing to update.' },
      },
      { status: 400 }
    )
  const title = input.title === undefined ? undefined : input.title.trim()
  if (title !== undefined && !title)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/invalid-body', message: 'A task needs a title.' },
      },
      { status: 400 }
    )
  const result = await crm.requestTasks.update(
    context.orgId,
    requestId,
    taskId,
    {
      ...input,
      ...(title === undefined ? {} : { title }),
      completedBy: context.userId,
    }
  )
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId, taskId } = await route.params
  const result = await crm.requestTasks.delete(
    context.orgId,
    requestId,
    taskId,
    { deletedBy: context.userId }
  )
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
