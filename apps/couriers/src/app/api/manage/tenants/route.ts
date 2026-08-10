import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus, toCouriersTenant } from '@/lib/couriers'
import { $876 } from '@/lib/876'

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
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (ctx.tenant) {
    return apiJson(
      { error: 'A courier tenant already exists for this organization.' },
      { status: 409 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = TenantCreateSchema.safeParse(body)
  if (!parsed.success) {
    return apiJson(
      {
        error:
          'Provide only a non-empty name and a lowercase letters, numbers, or hyphens slug.',
      },
      { status: 422 }
    )
  }

  const { name, slug } = parsed.data

  const result = await $876.couriers.tenants.create({
    org_id: ctx.orgId,
    name,
    slug,
    owner_user_id: ctx.userId,
  })
  if (result.error) {
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )
  }

  return apiJson(
    { object: 'tenant', ...toCouriersTenant(result.data) },
    { status: 201 }
  )
}
