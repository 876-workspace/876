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
import type { ClientOptions as PlatformClientOptions } from '@876/sdk'
import type { StorageClientOptions, StorageClient } from '@876/storage'
import type {
  CreateWidgetsClientOptions,
  WidgetsClient,
} from '@876/widgets/server'
import type { WidgetsAdminClient } from '@876/widgets/server/admin'
import type { AppId } from '../context/types'

export interface BaseServiceClientOptions {
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
  widgets?: {
    member?: CreateWidgetsClientOptions
    admin?: CreateWidgetsClientOptions
  }
}

interface BaseServerOptions extends PlatformClientOptions {
  requestId?: string
}

export interface ConsoleServerClientOptions extends BaseServerOptions {
  app: 'console'
  services: BaseServiceClientOptions & {
    platformAdmin: Admin876ClientOptions
    billing: {
      admin: BillingAdminClientOptions
      integration: BillingIntegrationClientOptions
    }
    couriers: {
      admin: CouriersAdminClientOptions
    }
    storage: StorageClientOptions
    widgets: {
      member: CreateWidgetsClientOptions
      admin: CreateWidgetsClientOptions
    }
  }
}

export interface CouriersServerClientOptions extends BaseServerOptions {
  app: 'couriers'
  services: BaseServiceClientOptions & {
    couriers: {
      client: CouriersClientOptions
      admin?: CouriersAdminClientOptions
    }
    billing?: {
      tenant?: BillingClientOptions
      integration?: BillingIntegrationClientOptions
    }
    storage: StorageClientOptions
    widgets: {
      member: CreateWidgetsClientOptions
    }
  }
}

export interface BillingServerClientOptions extends BaseServerOptions {
  app: 'billing'
  services: BaseServiceClientOptions & {
    billing: {
      tenant: BillingClientOptions
      admin?: BillingAdminClientOptions
    }
    widgets: {
      member: CreateWidgetsClientOptions
    }
  }
}

export interface InvoiceServerClientOptions extends BaseServerOptions {
  app: 'invoice'
  services: BaseServiceClientOptions & {
    billing: {
      tenant: BillingClientOptions
    }
  }
}

export interface PlatformServerClientOptions extends BaseServerOptions {
  app: '876' | 'enterprise'
  services?: BaseServiceClientOptions
}

export type ServerClientOptions =
  | ConsoleServerClientOptions
  | CouriersServerClientOptions
  | BillingServerClientOptions
  | InvoiceServerClientOptions
  | PlatformServerClientOptions

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
  widgets?: {
    member?: WidgetsClient
    admin?: WidgetsAdminClient
  }
}
