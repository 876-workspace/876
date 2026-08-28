import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import { withAdmin } from '../internal/with-admin'
import { createCoreSurface } from './base'
import {
  createPlatformControlPlane,
  createWorkspaceControlPlane,
} from './control-planes'
import type { ConsoleServerClientOptions } from '../internal/types'

/**
 * Creates Console's three server-side surfaces from one set of service clients.
 *
 * - `$876` — resource/data plane
 * - `workspace` — organization workspace control plane
 * - `platform` — 876 operator control plane
 */
export function createConsoleSurfaces(options: ConsoleServerClientOptions) {
  const services = createServiceClients(options)
  const platformClient = services.platform
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
  const crm = requireCapability(services.crm, 'crm')
  const storage = requireCapability(services.storage, 'storage')
  const widgetsMember = requireCapability(
    services.widgets?.member,
    'widgets.member'
  )
  const widgetsAdmin = requireCapability(
    services.widgets?.admin,
    'widgets.admin'
  )

  const core = createCoreSurface({
    platform: platformClient,
    admin: platformAdmin,
  })

  const $876 = {
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
    customerProfiles: crm.customers,
    requests: crm.requests,
    requestTasks: crm.requestTasks,
    requestReminders: crm.requestReminders,
    requestNotes: crm.requestNotes,
    requestCategories: crm.requestCategories,
    files: storage.files,
    uploads: storage.uploads,
    notes: withAdmin(widgetsMember.notes, widgetsAdmin.notes),
    collections: widgetsMember.collections,
  }

  return {
    $876,
    workspace: createWorkspaceControlPlane(platformAdmin),
    platform: createPlatformControlPlane(platformAdmin),
  }
}

export function createConsoleClient(options: ConsoleServerClientOptions) {
  return createConsoleSurfaces(options).$876
}

export type ConsoleSurfaces = ReturnType<typeof createConsoleSurfaces>
export type Console876Client = ConsoleSurfaces['$876']
