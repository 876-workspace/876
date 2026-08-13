import 'server-only'

import { create876ServerClient } from '@876/client/server'
import { headers } from 'next/headers'

function createCouriers876Client(requestId?: string) {
  return create876ServerClient({
    app: 'couriers',
    apiKey: process.env.API_876_KEY,
    requestId,
    services: {
      billing: {
        tenant: {
          baseUrl: process.env.BILLING_API_URL,
          apiKey: process.env.API_876_KEY!,
          requestId,
        },
      },
      couriers: {
        admin: {
          baseUrl: process.env.COURIERS_API_URL,
          internalKey: process.env.API_INTERNAL_KEY!,
          requestId,
        },
      },
      storage: {
        internalKey: process.env.STORAGE_INTERNAL_KEY!,
        requestId,
      },
      widgets: {
        baseUrl: process.env.WIDGETS_API_URL,
        serviceKey: process.env.WIDGETS_SERVICE_KEY,
      },
    },
  })
}

export const $876 = createCouriers876Client()

export async function get876Client() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  return createCouriers876Client(requestId)
}

export type Couriers876Client = ReturnType<typeof createCouriers876Client>
