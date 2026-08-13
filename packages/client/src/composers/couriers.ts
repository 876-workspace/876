import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import { createCoreSurface } from './base'
import type { CouriersServerClientOptions } from '../internal/types'

export function createCouriersClient(options: CouriersServerClientOptions) {
  const services = createServiceClients(options)
  const storage = requireCapability(services.storage, 'storage')
  const widgets = requireCapability(services.widgets?.member, 'widgets.member')
  const core = createCoreSurface({ platform: services.platform })
  const couriersClient = services.couriers?.client
  const couriersAdmin = services.couriers?.admin
  const couriers = (couriersClient ?? (couriersAdmin as unknown as typeof couriersClient)) as NonNullable<typeof couriersClient>
  if (!couriers) {
    requireCapability(undefined, 'couriers.client')
  }
  return {
    ...core,
    customers: couriers.customers,
    packages: couriers.packages,
    branches: couriers.branches,
    warehouses: couriers.warehouses,
    mailboxes: couriers.mailboxes,
    addresses: couriers.addresses,
    roles: couriers.roles,
    memberships: couriers.memberships,
    files: storage.files,
    uploads: storage.uploads,
    notes: widgets.notes,
    collections: widgets.collections,
  }
}

export type Couriers876Client = ReturnType<typeof createCouriersClient>
