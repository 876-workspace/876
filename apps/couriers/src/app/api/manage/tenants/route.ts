import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toCouriersTenant } from '@/lib/couriers'
import { couriersOperator } from '@/lib/services/couriers'

export const runtime = 'nodejs'

const TenantCreateSchema = z.strictObject({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
})

export async function POST(request: NextRequest) {
  const ctx = await getManageContext()
  if (!ctx) {
    return errorResponse('auth/no-session')
  }

  if (ctx.tenant) {
    return errorResponse('tenant/already-exists')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('request/invalid-json')
  }

  const parsed = TenantCreateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('request/invalid')
  }

  const { name, slug } = parsed.data

  const result = await couriersOperator.tenants.create({
    org_id: ctx.orgId,
    name,
    slug,
    creator_user_id: ctx.userId,
  })
  if (result.error) {
    return errorResponse(result.error.code)
  }

  return apiJson(
    { object: 'tenant', ...toCouriersTenant(result.data) },
    { status: 201 }
  )
}
