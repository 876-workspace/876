import 'server-only'

import { create876ServerClient } from '@876/client/server'

export const $876 = create876ServerClient({
  app: 'crm',
  baseUrl: process.env.API_URL,
  services: {
    crm: {
      baseUrl: process.env.CRM_API_URL,
      internalKey: process.env.CRM_INTERNAL_KEY,
    },
  },
})
