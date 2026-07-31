import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { getPlatformClient } from '@/lib/876/platform-client'

export const runtime = 'nodejs'

type Params = { params: Promise<{ countryCode: string }> }

/** Pure transport for a country's subdivisions. See the countries route. */
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await getManageContext()
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const { countryCode } = await params
  if (!/^[A-Za-z]{2}$/.test(countryCode))
    return apiJson({ error: 'Invalid country code.' }, { status: 400 })

  const platform = await getPlatformClient()
  const { data, error } = await platform.regions.list(countryCode.toUpperCase())

  // A country with no subdivisions is an empty list, not an error — the form
  // uses it to decide whether a region is required at all.
  if (error) return apiJson({ data: [] })

  return apiJson({ data })
}
