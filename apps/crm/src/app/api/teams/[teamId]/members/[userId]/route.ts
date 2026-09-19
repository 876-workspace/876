import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/clients/crm'

type Context = { params: Promise<{ teamId: string; userId: string }> }

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

  const { teamId, userId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as {
    role?: unknown
  }
  const result = await crm.teams.members.update(context.orgId, teamId, userId, {
    role: body.role,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { teamId, userId } = await route.params
  const result = await crm.teams.members.remove(context.orgId, teamId, userId)

  return Response.json(result, { status: result.error ? 400 : 200 })
}
