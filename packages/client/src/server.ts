import 'server-only'
import { createConsoleClient, type Console876Client } from './composers/console'
import { createCouriersClient, type Couriers876Client } from './composers/couriers'
import { createBillingClient, type Billing876Client } from './composers/billing'
import { createPlatformServerClient, type Platform876Client } from './composers/platform'
import type {
  BillingServerClientOptions,
  ConsoleServerClientOptions,
  CouriersServerClientOptions,
  PlatformServerClientOptions,
  ServerClientOptions,
} from './internal/types'

export function create876ServerClient(options: ConsoleServerClientOptions): Console876Client
export function create876ServerClient(options: CouriersServerClientOptions): Couriers876Client
export function create876ServerClient(options: BillingServerClientOptions): Billing876Client
export function create876ServerClient(options: PlatformServerClientOptions): Platform876Client
export function create876ServerClient(
  options: ServerClientOptions,
): Console876Client | Couriers876Client | Billing876Client | Platform876Client {
  switch (options.app) {
    case 'console':
      return createConsoleClient(options)
    case 'couriers':
      return createCouriersClient(options)
    case 'billing':
      return createBillingClient(options)
    default:
      return createPlatformServerClient(options as PlatformServerClientOptions)
  }
}

export type ServerClient876 =
  | Console876Client
  | Couriers876Client
  | Billing876Client
  | Platform876Client

export type { Admin876ClientOptions } from '@876/admin'
export type { IntegrationClientOptions as BillingIntegrationClientOptions } from '@876/billing/integration'
export type { AdminClientOptions as CouriersAdminClientOptions } from '@876/couriers/admin'
export type { CreateWidgetsClientOptions } from '@876/widgets/server'
export type { StorageClientOptions } from '@876/storage'
export type { ServerClientOptions } from './internal/types'
