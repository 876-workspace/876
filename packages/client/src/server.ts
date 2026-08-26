import 'server-only'
import {
  createConsoleClient,
  createConsoleSurfaces,
  type Console876Client,
  type ConsoleSurfaces,
} from './composers/console'
import {
  createCouriersClient,
  type Couriers876Client,
} from './composers/couriers'
import { createCrmClient, type Crm876Client } from './composers/crm'
import { createBillingClient, type Billing876Client } from './composers/billing'
import { createInvoiceClient, type Invoice876Client } from './composers/invoice'
import {
  createPlatformServerClient,
  type Platform876Client,
} from './composers/platform'
import type {
  InvoiceServerClientOptions,
  BillingServerClientOptions,
  ConsoleServerClientOptions,
  CouriersServerClientOptions,
  CrmServerClientOptions,
  PlatformServerClientOptions,
  ServerClientOptions,
} from './internal/types'

export { createConsoleSurfaces }
export type { ConsoleSurfaces }

export function create876ServerClient(
  options: ConsoleServerClientOptions
): Console876Client
export function create876ServerClient(
  options: CouriersServerClientOptions
): Couriers876Client
export function create876ServerClient(
  options: CrmServerClientOptions
): Crm876Client
export function create876ServerClient(
  options: BillingServerClientOptions
): Billing876Client
export function create876ServerClient(
  options: InvoiceServerClientOptions
): Invoice876Client
export function create876ServerClient(
  options: PlatformServerClientOptions
): Platform876Client
export function create876ServerClient(
  options: ServerClientOptions
):
  | Console876Client
  | Couriers876Client
  | Crm876Client
  | Billing876Client
  | Invoice876Client
  | Platform876Client {
  switch (options.app) {
    case 'console':
      return createConsoleClient(options)
    case 'couriers':
      return createCouriersClient(options)
    case 'crm':
      return createCrmClient(options)
    case 'billing':
      return createBillingClient(options)
    case 'invoice':
      return createInvoiceClient(options)
    case '876':
    case 'enterprise':
      return createPlatformServerClient(options)
    default:
      return assertNever(options)
  }
}

/**
 * Exhaustiveness guard for the app dispatch above. If a new app id is added to
 * `ServerClientOptions` without a matching composer, `options` is no longer
 * `never` here and this fails to compile — a new app can never silently fall
 * through to the platform surface.
 */
function assertNever(options: never): never {
  const app = (options as { app?: string }).app
  throw new Error(
    `Unsupported 876 app for create876ServerClient: ${String(app)}`
  )
}

export type ServerClient876 =
  | Console876Client
  | Couriers876Client
  | Crm876Client
  | Billing876Client
  | Invoice876Client
  | Platform876Client

export type { Invoice876Client } from './composers/invoice'
export type { Couriers876Client } from './composers/couriers'
export type { Crm876Client } from './composers/crm'
export type { Admin876ClientOptions } from '@876/admin'
export type { IntegrationClientOptions as BillingIntegrationClientOptions } from '@876/billing/integration'
export type { AdminClientOptions as CouriersAdminClientOptions } from '@876/couriers/admin'
export type { ClientOptions as CrmClientOptions } from '@876/crm'
export type { CreateWidgetsClientOptions } from '@876/widgets/server'
export type { StorageClientOptions } from '@876/storage'
export type { ServerClientOptions } from './internal/types'
