import 'server-only'

import { create876CouriersAdminClient } from '@876/couriers/admin'

export const $couriers = create876CouriersAdminClient({
  baseUrl: process.env.COURIERS_API_URL,
  internalKey:
    process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY,
})
