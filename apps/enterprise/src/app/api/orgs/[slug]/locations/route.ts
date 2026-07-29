import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import type { OrgLocationCreateParams } from '@876/sdk'

import { get876ServerClient } from '@/lib/876/server'
import { authorizeOrgRequest } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

const LOCATION_FIELDS = [
  'name',
  'code',
  'type',
  'status',
  'is_primary',
  'phone',
  'email',
  'line1',
  'line2',
  'city',
  'region_id',
  'country_code',
  'postal_code',
  'timezone',
] as const satisfies readonly (keyof OrgLocationCreateParams)[]

function pickLocationFields(
  body: Record<string, unknown>
): Partial<OrgLocationCreateParams> {
  const params: Partial<OrgLocationCreateParams> = {}
  for (const field of LOCATION_FIELDS) {
    if (field in body) params[field] = body[field] as never
  }

  return params
}

/** Creates a location. Pure transport over `$876.locations.create`. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  const auth = await authorizeOrgRequest(slug, 'structure:manage')
  if (auth.response) return auth.response

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return apiJson({ error: 'A name is required.' }, { status: 400 })
  }

  const client = await get876ServerClient()
  const { data, error } = await client.locations.create(
    auth.membership.organization.id,
    { ...pickLocationFields(body ?? {}), name }
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create the location.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
