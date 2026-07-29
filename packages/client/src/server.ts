import 'server-only'

import {
  create876BillingIntegrationClient,
  type IntegrationClientOptions as BillingIntegrationClientOptions,
} from '@876/billing/integration'
import {
  create876Client as createPlatformClient,
  type ClientOptions as PlatformClientOptions,
} from '@876/sdk'
import { create876StorageClient, type StorageClientOptions } from '@876/storage'
import {
  createWidgetsClient,
  type CreateWidgetsClientOptions,
} from '@876/widgets/server'

export type ServerClientOptions = {
  /** Core 876 API configuration for app-key or delegated session calls. */
  platform?: PlatformClientOptions
  /** Storage service configuration. */
  storage?: StorageClientOptions
  /** Cross-application Billing configuration. */
  billing?: BillingIntegrationClientOptions
  /** Widgets data-service configuration. */
  widgets?: CreateWidgetsClientOptions
}

/**
 * Creates a server-only 876 root for product applications.
 *
 * Secret service credentials stay within this entry point. The resulting
 * client exposes `$876.storage`, `$876.billing`, and `$876.widgets` alongside
 * the ordinary platform namespaces.
 */
export function create876ServerClient(options: ServerClientOptions = {}) {
  return {
    ...createPlatformClient(options.platform),
    storage: create876StorageClient(options.storage),
    billing: create876BillingIntegrationClient(options.billing),
    widgets: createWidgetsClient(options.widgets),
  }
}

export type ServerClient876 = ReturnType<typeof create876ServerClient>

export type {
  BillingIntegrationClientOptions,
  CreateWidgetsClientOptions,
  PlatformClientOptions,
  StorageClientOptions,
}
