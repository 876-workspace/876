import 'server-only'

import { create876ServerClient } from '@876/client/server'

export const $876 = create876ServerClient({
  app: 'billing',
  apiKey: process.env.BILLING_API_876_KEY,
  services: {
    billing: {
      tenant: {
        baseUrl: process.env.BILLING_API_URL,
        apiKey: process.env.BILLING_API_876_KEY!,
      },
    },
    widgets: {
      baseUrl: process.env.WIDGETS_API_URL,
      serviceKey: process.env.WIDGETS_SERVICE_KEY,
    },
  },
})
