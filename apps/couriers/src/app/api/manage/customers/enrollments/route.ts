import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { enrollManagedCustomer } from '@/lib/manage/customers'
import { customerEnrollmentParamsSchema } from '@/types/customer'

export const runtime = 'nodejs'

const requestSchema = customerEnrollmentParamsSchema.extend({
  orgSlug: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid customer enrollment.' }, { status: 422 })

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage customers.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const result = await enrollManagedCustomer({
    tenant: ctx.tenant,
    params,
  })
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
