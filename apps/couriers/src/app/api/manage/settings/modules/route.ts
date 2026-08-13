import 'server-only'

import { apiJson } from '@876/core/api'
import { moduleKeySchema } from '@876/couriers/admin'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus } from '@/lib/couriers'
import { couriersAdmin } from '@/lib/876'

export const runtime = 'nodejs'

const toggleSchema = z.strictObject({
  orgSlug: z.string().min(1),
  module: moduleKeySchema,
  isEnabled: z.boolean(),
})

export async function GET(request: NextRequest) {
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

  const result = await couriersAdmin.settings.list(ctx.tenant.id)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid module state.' }, { status: 422 })
  }

  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid module state.' }, { status: 422 })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to edit settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const result = await couriersAdmin.settings.update(
    ctx.tenant.id,
    parsed.data.module,
    {
      is_enabled: parsed.data.isEnabled,
    }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: result.data })
}
