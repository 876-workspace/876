import { buildAdminRuntime } from './runtime'
import { createAdminCustomersResource } from './resources/customers'
import { createAdminPlansResource } from './resources/plans'
import { createAdminPricesResource } from './resources/prices'
import { createAdminProductsResource } from './resources/products'
import { createAdminSubscriptionsResource } from './resources/subscriptions'
import { createAdminStatsResource } from './resources/stats'
import type { AdminClientOptions } from './types'

/** Creates the server-only 876 Billing administration client. */
export function create876AdminClient(options: AdminClientOptions = {}) {
  const runtime = buildAdminRuntime(options)

  return {
    products: createAdminProductsResource(runtime),
    plans: createAdminPlansResource(runtime),
    prices: createAdminPricesResource(runtime),
    customers: createAdminCustomersResource(runtime),
    subscriptions: createAdminSubscriptionsResource(runtime),
    stats: createAdminStatsResource(runtime),
  }
}

export type AdminClient = ReturnType<typeof create876AdminClient>
