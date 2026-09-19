import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getPlatformClient } from '@/lib/clients/platform'

export const runtime = 'nodejs'

type Params = { params: Promise<{ countryCode: string }> }

/** Pure transport for a country's subdivisions. See the countries route. */
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await getManageContext()
  if (!ctx) return errorResponse('auth/no-session')

  const { countryCode } = await params
  if (!/^[A-Za-z]{2}$/.test(countryCode))
    return errorResponse('address/unknown-country')

  const platform = await getPlatformClient()
  const { data, error } = await platform.regions.list(countryCode.toUpperCase())

  // A country with no subdivisions is an empty list, not an error — the form
  // uses it to decide whether a region is required at all.
  if (error) return apiJson({ data: [] })

  return apiJson({ data })
}
