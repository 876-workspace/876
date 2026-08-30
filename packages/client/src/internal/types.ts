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
import type {
  ClientOptions as CrmClientOptions,
  CrmClient,
  CrmWorkspaceClient,
} from '@876/crm'
import type { SDK876Client } from '@876/sdk'
import type { ClientOptions as PlatformClientOptions } from '@876/sdk'
import type { StorageClientOptions, StorageClient } from '@876/storage'
import type {
  CreateWidgetsClientOptions,
  WidgetsClient,
} from '@876/widgets/server'
import type { WidgetsAdminClient } from '@876/widgets/server/admin'
import type {
  WorkIntegrationClient,
  WorkIntegrationClientOptions,
} from '@876/work/integration'
import type {
  WorkOperatorClient,
  WorkOperatorClientOptions,
} from '@876/work/operator'
import type {
  WorkSessionClient,
  WorkSessionClientOptions,
} from '@876/work/session'

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
  crm?: CrmClientOptions
  storage?: StorageClientOptions
  widgets?: {
    member?: CreateWidgetsClientOptions
    admin?: CreateWidgetsClientOptions
  }
  work?: {
    operator?: WorkOperatorClientOptions
    integration?: WorkIntegrationClientOptions
    session?: WorkSessionClientOptions
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
    couriers: { admin: CouriersAdminClientOptions }
    crm: CrmClientOptions
    storage: StorageClientOptions
    widgets: {
      member: CreateWidgetsClientOptions
      admin: CreateWidgetsClientOptions
    }
    work: { operator: WorkOperatorClientOptions }
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
    widgets: { member: CreateWidgetsClientOptions }
    work?: {
      integration?: WorkIntegrationClientOptions
      session?: WorkSessionClientOptions
    }
  }
}

export interface CrmServerClientOptions extends BaseServerOptions {
  app: 'crm'
  services: BaseServiceClientOptions & {
    crm: CrmClientOptions
    work?: {
      integration?: WorkIntegrationClientOptions
      session?: WorkSessionClientOptions
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
    widgets: { member: CreateWidgetsClientOptions }
    work?: {
      integration?: WorkIntegrationClientOptions
      session?: WorkSessionClientOptions
    }
  }
}

export interface InvoiceServerClientOptions extends BaseServerOptions {
  app: 'invoice'
  services: BaseServiceClientOptions & {
    billing: { tenant: BillingClientOptions }
    work?: {
      integration?: WorkIntegrationClientOptions
      session?: WorkSessionClientOptions
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
  | CrmServerClientOptions
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
  crm?: CrmClient
  crmWorkspace?: CrmWorkspaceClient
  storage?: StorageClient
  widgets?: {
    member?: WidgetsClient
    admin?: WidgetsAdminClient
  }
  work?: {
    operator?: WorkOperatorClient
    integration?: WorkIntegrationClient
    session?: WorkSessionClient
  }
}
