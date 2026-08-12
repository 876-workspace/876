import 'server-only'

import { create876ServerClient } from '@876/client/server'

export function createConsole876Client(requestId?: string) {
  return create876ServerClient({
    app: 'console',
    apiKey: process.env.API_876_KEY,
    internalKey: process.env.API_INTERNAL_KEY!,
    requestId,
    services: {
      billing: {
        baseUrl: process.env.BILLING_API_URL,
        internalKey: process.env.BILLING_INTERNAL_KEY,
        requestId,
      },
      couriers: {
        baseUrl: process.env.COURIERS_API_URL,
        apiKey: process.env.COURIERS_API_KEY,
        internalKey:
          process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY,
        requestId,
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

export const $876 = createConsole876Client()
export type Console876Client = ReturnType<typeof createConsole876Client>
