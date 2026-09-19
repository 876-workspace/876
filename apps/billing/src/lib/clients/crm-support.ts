import 'server-only'

import { create876CrmSupportClient } from '@876/crm/support'

import { BILLING_APP_SLUG } from '@/lib/billing-app'

let supportClient: ReturnType<typeof create876CrmSupportClient> | null = null

export function getCrmSupport() {
  if (supportClient) return supportClient

  supportClient = create876CrmSupportClient({
    baseUrl: process.env.CRM_API_URL,
    serviceApp: BILLING_APP_SLUG,
    serviceKey: process.env.CRM_SUPPORT_SERVICE_KEY,
  })
  return supportClient
}
