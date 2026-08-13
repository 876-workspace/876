import type { Admin876Client } from '@876/admin'
import type { AdminClient as BillingAdminClient } from '@876/billing/admin'
import type { BillingIntegrationClient } from '@876/billing/integration'
import type { Client as BillingClient } from '@876/billing'
import type { CouriersAdminClient } from '@876/couriers/admin'
import type { CouriersClient } from '@876/couriers'
import type { SDK876Client } from '@876/sdk'
import type { StorageClient } from '@876/storage'
import type { WidgetsClient } from '@876/widgets/server'

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
