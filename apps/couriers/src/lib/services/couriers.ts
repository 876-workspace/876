import 'server-only'

import {
  create876CouriersClient,
  type CouriersClient,
} from '@876/couriers'
import {
  create876CouriersOperatorClient,
  type CouriersOperatorClient,
} from '@876/couriers/operator'
import { headers } from 'next/headers'

import { getAccessToken } from '@/lib/auth/session'

function operatorOptions(requestId?: string) {
  return {
    baseUrl: process.env.COURIERS_API_URL,
    apiKey: process.env.API_876_KEY!,
    internalKey: process.env.API_INTERNAL_KEY!,
    requestId,
  }
}

/** Request-scoped Couriers client carrying the signed-in member's bearer token. */
export async function getCouriers(): Promise<CouriersClient> {
  const [accessToken, requestHeaders] = await Promise.all([
    getAccessToken(),
    headers(),
  ])
  if (!accessToken)
    throw new Error('An authenticated session is required for Couriers resources.')

  return create876CouriersClient({
    baseUrl: process.env.COURIERS_API_URL,
    apiKey: process.env.API_876_KEY!,
    accessToken,
    requestId: requestHeaders.get('x-request-id') ?? undefined,
  })
}

/** Couriers-owned operator capabilities used by server-only management flows. */
export function createCouriersOperator(
  requestId?: string
): CouriersOperatorClient {
  return create876CouriersOperatorClient(operatorOptions(requestId))
}

export const couriersOperator = createCouriersOperator()
