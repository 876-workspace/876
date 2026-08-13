import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'
import {
  create876ServerClient,
  type Couriers876Client,
} from '@876/client/server'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { create876StorageClient } from '@876/storage'
import { createWidgetsClient } from '@876/widgets/server'
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

/**
 * Non-session storage client for operations that authenticate with the
 * internal storage key rather than a user session (e.g. organization logo
 * uploads). Not for user-scoped file resources, which come from
 * `get876Client`.
 */
export const storage876 = create876StorageClient({
  internalKey: process.env.STORAGE_INTERNAL_KEY!,
})

/**
 * Non-session widgets member client for operations that authenticate with the
 * widgets service key rather than a user session (e.g. notepad routes).
 */
export const widgets876 = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})

function createCouriers876Client(
  accessToken: string,
  requestId?: string
): Couriers876Client {
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

/**
 * Request-scoped session client for Couriers resources. Requires an
 * authenticated session; a missing access token is an authentication
 * condition, not a reason to fall back to an unauthenticated client.
 */
export async function get876Client() {
  const [accessToken, requestHeaders] = await Promise.all([
    getAccessToken(),
    headers(),
  ])
  const requestId = requestHeaders.get('x-request-id') ?? undefined
  if (!accessToken) {
    throw new Error(
      'An authenticated session is required for Couriers resources.'
    )
  }
  return createCouriers876Client(accessToken, requestId)
}
