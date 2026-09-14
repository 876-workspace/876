import 'server-only'

import { apiJson } from '@876/core/api'
import { moduleKeySchema } from '@876/couriers/admin'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { couriersOperator } from '@/lib/services/couriers'

export const runtime = 'nodejs'

const toggleSchema = z.strictObject({
  orgSlug: z.string().min(1),
  module: moduleKeySchema,
  isEnabled: z.boolean(),
})

export async function GET(request: NextRequest) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('settings/organization-required')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const result = await couriersOperator.settings.list(ctx.tenant.id)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('settings/invalid-module-state')
  }

  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success) return errorResponse('settings/invalid-module-state')

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const result = await couriersOperator.settings.update(
    ctx.tenant.id,
    parsed.data.module,
    {
      is_enabled: parsed.data.isEnabled,
    }
  )
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data })
}
