import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ teamId: string }> }

export async function POST(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const { teamId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const $876 = await get876Client()

  const result = await $876.teams.members.add(context.orgId, teamId, {
    ...input,
    addedBy: context.userId,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 201 })
}
