import 'server-only'

import { create876ServerClient } from '@876/client/server'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { headers } from 'next/headers'

import { getAccessToken } from '@/lib/auth/session'

function getCouriersAdminOptions(requestId?: string) {
  return {
    baseUrl: process.env.COURIERS_API_URL,
    internalKey: process.env.API_INTERNAL_KEY!,
    requestId,
  }
}

function getBillingIntegrationOptions(requestId?: string) {
  return {
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.API_876_KEY!,
    requestId,
  }
}

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
        client: {
          baseUrl: process.env.COURIERS_API_URL,
          apiKey: process.env.API_876_KEY!,
          accessToken: 'placeholder',
          requestId,
        },
        admin: getCouriersAdminOptions(requestId),
      },
      storage: {
        internalKey: process.env.STORAGE_INTERNAL_KEY!,
        requestId,
      },
      widgets: {
        member: {
          baseUrl: process.env.WIDGETS_API_URL,
          serviceKey: process.env.WIDGETS_SERVICE_KEY,
        },
      },
    },
  })
}

export const $876 = createCouriers876Client()

/**
 * Internal Couriers admin client for Couriers-specific operations not exposed
 * on the canonical `$876` surface (e.g. tenant lookup in `getManageContext`,
 * settings/modules management). Not for use in app UI code.
 */
export const couriersAdmin = create876CouriersAdminClient(
  getCouriersAdminOptions()
)

/**
 * Internal Billing integration client for Couriers portal operations that
 * require the Billing integration tier (e.g. customer enrollment). Not for
 * use in app UI code.
 */
export const billingIntegration = create876BillingIntegrationClient(
  getBillingIntegrationOptions()
)

export async function get876Client() {
  const [accessToken, requestHeaders] = await Promise.all([
    getAccessToken(),
    headers(),
  ])
  const requestId = requestHeaders.get('x-request-id') ?? undefined
  if (!accessToken) {
    return $876 as unknown as ReturnType<typeof createCouriers876Client>
  }
  return create876ServerClient({
    app: 'couriers',
    apiKey: process.env.API_876_KEY!,
    accessToken,
    requestId,
    services: {
      couriers: {
        client: {
          baseUrl: process.env.COURIERS_API_URL,
          apiKey: process.env.API_876_KEY!,
          accessToken,
          requestId,
        },
      },
      billing: {
        tenant: {
          baseUrl: process.env.BILLING_API_URL,
          apiKey: process.env.API_876_KEY!,
          requestId,
        },
      },
      storage: {
        internalKey: process.env.STORAGE_INTERNAL_KEY!,
        requestId,
      },
      widgets: {
        member: {
          baseUrl: process.env.WIDGETS_API_URL,
          serviceKey: process.env.WIDGETS_SERVICE_KEY,
        },
      },
    },
  }) as unknown as ReturnType<typeof createCouriers876Client>
}

export type Couriers876Client = ReturnType<typeof createCouriers876Client>
