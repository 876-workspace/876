import {
  create876Client as createBillingClient,
  type ClientOptions as BillingClientOptions,
} from '@876/billing'
import {
  create876Client as createPlatformClient,
  type ClientOptions as PlatformClientOptions,
} from '@876/sdk'
import { browserCollections, browserNotes } from '@876/widgets/browser'

export type ClientOptions = PlatformClientOptions & {
  /** Tenant-scoped Billing configuration. */
  billing?: BillingClientOptions
}

const widgets = {
  notes: {
    list: browserNotes.list,
    create: browserNotes.create,
    update: browserNotes.update,
    delete: browserNotes.delete,
  },
  collections: browserCollections,
}

/**
 * Creates the client-safe root for the 876 ecosystem.
 *
 * Feature packages remain independently maintained, while applications use
 * one branded root: `$876.auth.*`, `$876.billing.*`, and `$876.widgets.*`.
 * Server-only services are composed by `@876/client/server`.
 */
export function create876Client(options: ClientOptions = {}) {
  const { billing: billingOptions, ...platformOptions } = options
  return {
    ...createPlatformClient(platformOptions),
    billing: createBillingClient(billingOptions),
    widgets,
  }
}

export type Client876 = ReturnType<typeof create876Client>

export type { BillingClientOptions, PlatformClientOptions }
