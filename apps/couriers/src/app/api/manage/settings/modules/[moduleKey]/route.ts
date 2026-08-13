import 'server-only'

import { apiJson } from '@876/core/api'
import { moduleKeySchema } from '@876/couriers/admin'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus } from '@/lib/couriers'
import { couriersAdmin } from '@/lib/876'

export const runtime = 'nodejs'

const updateSchema = z.strictObject({
  orgSlug: z.string().min(1),
  values: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
})

type RouteContext = { params: Promise<{ moduleKey: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to view settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { moduleKey } = await context.params
  const parsedModule = moduleKeySchema.safeParse(moduleKey)
  if (!parsedModule.success)
    return apiJson({ error: 'Unknown module.' }, { status: 404 })
  const result = await couriersAdmin.settings.preferences.retrieve(
    ctx.tenant.id,
    parsedModule.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  const data = result.data
  return apiJson({
    data: {
      module: data.module,
      preferences: data.preferences,
      updatedAt: data.updated_at,
    },
  })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid preferences.' }, { status: 422 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid preferences.' }, { status: 422 })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to edit settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { moduleKey } = await context.params
  const parsedModule = moduleKeySchema.safeParse(moduleKey)
  if (!parsedModule.success)
    return apiJson({ error: 'Unknown module.' }, { status: 404 })
  const result = await couriersAdmin.settings.preferences.update(
    ctx.tenant.id,
    parsedModule.data,
    parsed.data.values
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  const data = result.data
  return apiJson({
    data: {
      module: data.module,
      preferences: data.preferences,
      updatedAt: data.updated_at,
    },
  })
}
