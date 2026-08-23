import { buildAdminRuntime } from './runtime'
import { createAdminCustomersResource } from './resources/customers'
import { createAdminPlansResource } from './resources/plans'
import { createAdminPricesResource } from './resources/prices'
import { createAdminProductsResource } from './resources/products'
import { createAdminSubscriptionsResource } from './resources/subscriptions'
import { createAdminStatsResource } from './resources/stats'
import { createAdminPaymentMethodsResource } from './resources/payment-methods'
import { createAdminPaymentIntentsResource } from './resources/payment-intents'
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
    paymentMethods: createAdminPaymentMethodsResource(runtime),
    paymentIntents: createAdminPaymentIntentsResource(runtime),
  }
}

export type AdminClient = ReturnType<typeof create876AdminClient>
