import type { Client as BillingClient } from '@876/billing'
import type { AdminClient as BillingAdminClient } from '@876/billing/admin'
import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../../internal/with-admin.ts'
import type { AppId } from '../../context/types.ts'
import type { ServiceClients } from '../../internal/types.ts'

export function createCustomersResource({
  app,
  services,
}: {
  app: AppId
  services: ServiceClients
}) {
  const billingTenant = services.billing?.tenant
  const billingAdmin = services.billing?.admin
  const couriersAdmin = services.couriers?.admin

  if (app === 'couriers' && couriersAdmin) {
    const { enroll, ...rest } = couriersAdmin.customers
    void enroll
    return rest as Omit<CouriersAdminClient['customers'], 'enroll'>
  }

  if (app === 'billing' && billingTenant) {
    const base: BillingClient['customers'] = billingTenant.customers
    return billingAdmin
      ? withAdmin(base, billingAdmin.customers)
      : base
  }

  if (billingTenant) {
    const base: BillingClient['customers'] = billingTenant.customers
    return billingAdmin
      ? withAdmin(base, billingAdmin.customers)
      : base
  }

  if (couriersAdmin) {
    const { enroll, ...rest } = couriersAdmin.customers
    void enroll
    return rest as Omit<CouriersAdminClient['customers'], 'enroll'>
  }

  if (billingAdmin) {
    return { admin: billingAdmin.customers }
  }

  return undefined
}
