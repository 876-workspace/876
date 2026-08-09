import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { $couriers } from '@/lib/couriers'
import {
  scheduleBranchMirror,
  statusForCouriersError,
  toBranchView,
} from '@/lib/manage/branches'
import { branchUpdateParamsSchema } from '@/types/branch'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid branch.' }, { status: 422 })
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success)
    return apiJson({ error: 'Invalid branch.' }, { status: 422 })

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = branchUpdateParamsSchema.safeParse(rest)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid branch.' },
      { status: 422 }
    )

  const result = await $couriers.branches.update(ctx.tenant.id, id, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    is_default: parsed.data.isDefault,
    is_active: parsed.data.isActive,
    settings: parsed.data.settings,
    ...(parsed.data.address
      ? {
          address: {
            name: parsed.data.address.name,
            line1: parsed.data.address.line1,
            line2: parsed.data.address.line2,
            city: parsed.data.address.city,
            country_code: parsed.data.address.countryCode,
            region_code: parsed.data.address.regionCode,
            postal_code: parsed.data.address.postalCode,
            latitude: parsed.data.address.latitude,
            longitude: parsed.data.address.longitude,
            is_active: parsed.data.address.isActive,
          },
        }
      : {}),
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      {
        status: statusForCouriersError(result.error.code),
        code: result.error.code,
      }
    )

  const branch = toBranchView(result.data)
  scheduleBranchMirror(ctx.tenant.orgId, branch)

  return apiJson({ data: branch })
}
