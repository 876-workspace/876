import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'
import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../internal/with-admin.ts'
import type { AppId } from '../context/types.ts'

export interface CreateCustomersResourceOptions {
  app: AppId
  billing?: BillingClient | BillingIntegrationClient
  billingAdmin?: unknown
  couriersAdmin?: CouriersAdminClient
}

export function createCustomersResource(options: CreateCustomersResourceOptions) : any {
  const { app, billing, couriersAdmin } = options

  // Couriers app uses courier customer workflow; billing app uses billing customer; console uses admin
  if (app === 'couriers' && couriersAdmin) {
    const base = couriersAdmin.customers
    // couriers customers currently requires tenantId; expose flat but keep tenantId param for now
    // admin variant is same but typed as admin
    return withAdmin(base as unknown as object, base as unknown as object) as typeof base & { admin: typeof base }
  }

  if (billing) {
    const base = (billing as unknown as { customers: object }).customers as object
    // if we have admin billing, attach
    const adminBase = (options.billingAdmin as unknown as { customers?: object } | undefined)?.customers as object | undefined
    if (adminBase) {
      return withAdmin(base as object, adminBase as object) as typeof base & { admin: typeof adminBase }
    }
    // also support withAdmin via same base for console-like
    return withAdmin(base as object, base as unknown as object) as typeof base & { admin: typeof base }
  }

  // fallback: return empty that will error at runtime if not configured, but satisfies type
  return { } as unknown as BillingClient['customers'] & { admin: BillingClient['customers'] }
}
