import type { PlatformAppName } from './platform-apps'

/** One first-party app a switcher can offer; structurally an `AppSwitcherApp`. */
export interface AppDirectoryEntry {
  name: string
  url: string
  current?: boolean
}

/**
 * Display names by registry key. The `Record` makes a newly registered app a
 * typecheck error here until it is named, so the list cannot drift silently.
 */
const APP_NAMES: Record<PlatformAppName, string> = {
  consumer: '876',
  billing: '876 Billing',
  couriers: '876 Couriers',
  crm: '876 CRM',
  projects: '876 Projects',
  invoice: '876 Invoice',
  enterprise: '876 Enterprise',
  console: '876 Console',
  commerce: '876 Commerce',
}

/** Switcher order, declared here and never derived from env iteration order. */
const APP_ORDER = [
  'consumer',
  'billing',
  'couriers',
  'crm',
  'projects',
  'invoice',
  'enterprise',
  'console',
  'commerce',
] as const satisfies readonly PlatformAppName[]

/**
 * Each app's browser-facing origin, read at call time.
 *
 * There is deliberately no fallback origin: an app whose variable is unset is
 * omitted from the switcher, because a default that works in dev silently
 * misroutes in production (.agents/rules/env-configuration.md rule 4).
 */
function appOrigins(): Record<PlatformAppName, string | undefined> {
  return {
    consumer: process.env.NEXT_PUBLIC_APP_URL,
    billing: process.env.NEXT_PUBLIC_BILLING_URL,
    couriers: process.env.NEXT_PUBLIC_COURIERS_URL,
    crm: process.env.NEXT_PUBLIC_CRM_URL,
    projects: process.env.NEXT_PUBLIC_PROJECTS_URL,
    invoice: process.env.NEXT_PUBLIC_INVOICE_URL,
    enterprise: process.env.NEXT_PUBLIC_ENTERPRISE_URL,
    console: process.env.NEXT_PUBLIC_CONSOLE_URL,
    commerce: process.env.NEXT_PUBLIC_COMMERCE_URL,
  }
}

/** Every first-party app whose origin is configured, with `current` marked. */
export function buildAppsDirectory({
  current,
  currentUrl = '/',
}: {
  current: PlatformAppName
  currentUrl?: string
}): AppDirectoryEntry[] {
  const origins = appOrigins()
  const entries: AppDirectoryEntry[] = []

  for (const app of APP_ORDER) {
    if (app === current) {
      entries.push({ name: APP_NAMES[app], url: currentUrl, current: true })
      continue
    }

    const url = origins[app]?.trim()
    if (url) entries.push({ name: APP_NAMES[app], url })
  }

  return entries
}
