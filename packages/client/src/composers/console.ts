import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import { withAdmin } from '../internal/with-admin'
import { createCoreSurface } from './base'
import type { ConsoleServerClientOptions } from '../internal/types'

export function createConsoleClient(options: ConsoleServerClientOptions) {
  const services = createServiceClients(options)
  const platform = services.platform
  const platformAdmin = requireCapability(
    services.platformAdmin,
    'platformAdmin'
  )
  const billingAdmin = requireCapability(
    services.billing?.admin,
    'billing.admin'
  )
  const billingIntegration = requireCapability(
    services.billing?.integration,
    'billing.integration'
  )
  const couriersAdmin = requireCapability(
    services.couriers?.admin,
    'couriers.admin'
  )
  const storage = requireCapability(services.storage, 'storage')
  const widgetsMember = requireCapability(
    services.widgets?.member,
    'widgets.member'
  )
  const widgetsAdmin = requireCapability(
    services.widgets?.admin,
    'widgets.admin'
  )

  const core = createCoreSurface({ platform, admin: platformAdmin })

  return {
    ...core,
    entitlementPlans: { admin: platformAdmin.products },
    plans: { admin: billingAdmin.plans },
    prices: { admin: billingAdmin.prices },
    customers: withAdmin(billingIntegration.customers, billingAdmin.customers),
    paymentMethods: billingIntegration.paymentMethods,
    paymentIntents: billingIntegration.paymentIntents,
    subscriptions: { admin: platformAdmin.subscriptions },
    packages: { admin: couriersAdmin.packages },
    branches: { admin: couriersAdmin.branches },
    warehouses: { admin: couriersAdmin.warehouses },
    mailboxes: { admin: couriersAdmin.mailboxes },
    files: storage.files,
    uploads: storage.uploads,
    notes: withAdmin(widgetsMember.notes, widgetsAdmin.notes),
    collections: widgetsMember.collections,
  }
}

export type Console876Client = ReturnType<typeof createConsoleClient>
