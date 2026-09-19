import 'server-only'

import { apiJson } from '@876/core/api'
import { moduleKeySchema } from '@876/couriers/admin'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { couriersOperator } from '@/lib/clients/couriers'

export const runtime = 'nodejs'

const updateSchema = z.strictObject({
  orgSlug: z.string().min(1),
  values: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
})

type RouteContext = { params: Promise<{ moduleKey: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('settings/organization-required')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const { moduleKey } = await context.params
  const parsedModule = moduleKeySchema.safeParse(moduleKey)
  if (!parsedModule.success) return errorResponse('settings/unknown-module')
  const result = await couriersOperator.settings.preferences.retrieve(
    ctx.tenant.id,
    parsedModule.data
  )
  if (result.error) return errorResponse(result.error.code)

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
    return errorResponse('settings/invalid-preferences')
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return errorResponse('settings/invalid-preferences')

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const { moduleKey } = await context.params
  const parsedModule = moduleKeySchema.safeParse(moduleKey)
  if (!parsedModule.success) return errorResponse('settings/unknown-module')
  const result = await couriersOperator.settings.preferences.update(
    ctx.tenant.id,
    parsedModule.data,
    parsed.data.values
  )
  if (result.error) return errorResponse(result.error.code)

  const data = result.data
  return apiJson({
    data: {
      module: data.module,
      preferences: data.preferences,
      updatedAt: data.updated_at,
    },
  })
}
