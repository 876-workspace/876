import type {
  BillingCustomer,
  BillingCustomerCreateParams,
} from '@876/billing/integration'

import { request } from './request'

export const createCustomer = (
  organizationId: string,
  params: BillingCustomerCreateParams
) =>
  request<BillingCustomer>(
    `/api/billing/integrations/organizations/${encodeURIComponent(organizationId)}/customers`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const billingIntegrations = { createCustomer }
