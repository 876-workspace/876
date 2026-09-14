import 'server-only'

import { apiJson } from '@876/core/api'
import { updatePackageBodySchema } from '@876/couriers/admin'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { couriersOperator } from '@/lib/services/couriers'

export const runtime = 'nodejs'

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

type Props = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return errorResponse('request/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.accessStatus === 'blocked') return errorResponse('auth/account-on-hold')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const payload = { ...(body as Record<string, unknown>) }
  delete payload.orgSlug
  const parsed = updatePackageBodySchema.safeParse(payload)
  if (!parsed.success) return errorResponse('request/invalid')

  const result = await couriersOperator.packages.update(
    ctx.tenant.id,
    id,
    parsed.data
  )
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data })
}
