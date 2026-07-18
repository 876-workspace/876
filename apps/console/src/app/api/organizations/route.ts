import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Creates an organization. Pure transport over `$876.orgs.create`. */
export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const body = (await request.json().catch(() => null)) as {
    name?: string | null
    short_name?: string | null
    slug?: string | null
    status?: string | null
    primary_phone?: string | null
    primary_email?: string | null
    website_url?: string | null
    address_line1?: string | null
    address_line2?: string | null
    city?: string | null
    region_id?: string | null
    country_code?: string | null
    currency_code?: string | null
  } | null

  if (!body) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await $876.orgs.create({
    name: body.name,
    short_name: body.short_name,
    slug: body.slug,
    status: body.status,
    primary_phone: body.primary_phone,
    primary_email: body.primary_email,
    website_url: body.website_url,
    address_line1: body.address_line1,
    address_line2: body.address_line2,
    city: body.city,
    region_id: body.region_id,
    country_code: body.country_code,
    currency_code: body.currency_code,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create organization.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
