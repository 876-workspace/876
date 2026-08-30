import 'server-only'

import { create876CouriersOperatorClient } from '@876/couriers/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.COURIERS_API_URL,
    internalKey: process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY!,
    requestId,
  }
}

export function createCouriers(requestId?: string) {
  return create876CouriersOperatorClient(options(requestId))
}

export const couriers = createCouriers()
