import type { Admin876ClientOptions, Admin876Client } from '@876/admin'
import type {
  Client as BillingClient,
  ClientOptions as BillingClientOptions,
} from '@876/billing'
import type {
  AdminClientOptions as BillingAdminClientOptions,
  AdminClient as BillingAdminClient,
} from '@876/billing/admin'
import type {
  IntegrationClientOptions as BillingIntegrationClientOptions,
  BillingIntegrationClient,
} from '@876/billing/integration'
import type {
  ClientOptions as CouriersClientOptions,
  CouriersClient,
} from '@876/couriers'
import type {
  AdminClientOptions as CouriersAdminClientOptions,
  CouriersAdminClient,
} from '@876/couriers/admin'
import type { SDK876Client } from '@876/sdk'
import type { StorageClientOptions, StorageClient } from '@876/storage'
import type {
  CreateWidgetsClientOptions,
  WidgetsClient,
} from '@876/widgets/server'
import type { AppId } from '../context/types'

/**
 * Core platform options. `apiKey`/`internalKey` may stay top-level for the
 * common single-credential case; the explicit service tiers below carry the
 * full per-service configuration.
 */
export interface PlatformClientOptions {
  apiKey?: string
  internalKey?: string
  requestId?: string
  baseUrl?: string
}

/**
 * Explicit service tiers. Each service exposes exactly the client types that
 * exist in its owning package — no tier is ever cast into another.
 */
export interface ServiceClientOptions {
  platformAdmin?: Admin876ClientOptions
  billing?: {
    tenant?: BillingClientOptions
    integration?: BillingIntegrationClientOptions
    admin?: BillingAdminClientOptions
  }
  couriers?: {
    client?: CouriersClientOptions
    admin?: CouriersAdminClientOptions
  }
  storage?: StorageClientOptions
  widgets?: CreateWidgetsClientOptions
}

/**
 * Options accepted by {@link create876ServerClient}. App context is required:
 * it names the requesting application and enables per-app composition.
 */
export interface ServerClientOptions extends PlatformClientOptions {
  app: AppId
  requestId?: string
  services?: ServiceClientOptions
}

/**
 * The typed internal service container produced by
 * {@link createServiceClients}. This is the single source of truth for what
 * each owning client tier can provide; the resource adapters read from it and
 * never guess a tier from a credential's presence.
 */
export interface ServiceClients {
  platform: SDK876Client
  platformAdmin?: Admin876Client
  billing?: {
    tenant?: BillingClient
    integration?: BillingIntegrationClient
    admin?: BillingAdminClient
  }
  couriers?: {
    client?: CouriersClient
    admin?: CouriersAdminClient
  }
  storage?: StorageClient
  widgets?: WidgetsClient
}
