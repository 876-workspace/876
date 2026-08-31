import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus, toTeamMemberView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { teamMemberUpdateParamsSchema } from '@/types/team'

export const runtime = 'nodejs'

const updateSchema = teamMemberUpdateParamsSchema.extend({
  orgSlug: z.string().min(1),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid team member.' }, { status: 422 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid team member.' }, { status: 422 })

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to update users.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.memberships.update(id, {
    ...(params.roleId === undefined ? {} : { role_id: params.roleId }),
    ...(params.status === undefined ? {} : { status: params.status }),
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: toTeamMemberView(result.data) })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to remove users.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.memberships.delete(id)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: { id: result.data.id, deleted: true } })
}
