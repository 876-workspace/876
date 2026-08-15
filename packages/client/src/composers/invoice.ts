import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import { createCoreSurface } from './base'
import type { InvoiceServerClientOptions } from '../internal/types'

export function createInvoiceClient(options: InvoiceServerClientOptions) {
  const services = createServiceClients(options)
  const billing = requireCapability(services.billing?.tenant, 'billing.tenant')
  const core = createCoreSurface({ platform: services.platform })
  return {
    ...core,
    invoices: billing.invoices,
  }
}

export type Invoice876Client = ReturnType<typeof createInvoiceClient>
