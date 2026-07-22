import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { service } from '@/lib/service'
import { getManageContext } from '@/lib/auth/manage-context'

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

  const result = await service.tenants.create({
    orgId: ctx.orgId,
    name,
    slug,
    ownerUserId: ctx.userId,
  })
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status })
  }

  return apiJson({ object: 'tenant', ...result.data }, { status: 201 })
}
