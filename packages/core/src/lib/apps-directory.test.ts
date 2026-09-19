import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildAppsDirectory } from './apps-directory'
import { PLATFORM_APP_SLUGS } from './platform-apps'
import type { PlatformAppName } from './platform-apps'

/** The browser-facing origin variable each app reads, per the module contract. */
const ORIGIN_ENV: Record<PlatformAppName, string> = {
  consumer: 'NEXT_PUBLIC_APP_URL',
  billing: 'NEXT_PUBLIC_BILLING_URL',
  couriers: 'NEXT_PUBLIC_COURIERS_URL',
  crm: 'NEXT_PUBLIC_CRM_URL',
  projects: 'NEXT_PUBLIC_PROJECTS_URL',
  invoice: 'NEXT_PUBLIC_INVOICE_URL',
  enterprise: 'NEXT_PUBLIC_ENTERPRISE_URL',
  console: 'NEXT_PUBLIC_CONSOLE_URL',
  commerce: 'NEXT_PUBLIC_COMMERCE_URL',
}

describe('buildAppsDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('marks the current app at the supplied currentUrl', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.example.test')

    const result = buildAppsDirectory({
      current: 'crm',
      currentUrl: '/island-logistics',
    })

    expect(result).toEqual([
      { name: '876 Billing', url: 'https://billing.example.test' },
      { name: '876 CRM', url: '/island-logistics', current: true },
    ])
  })

  it('defaults the current app url to / when currentUrl is omitted', () => {
    const result = buildAppsDirectory({ current: 'projects' })

    expect(result).toEqual([{ name: '876 Projects', url: '/', current: true }])
  })

  it('includes an app whose origin variable is configured, at that exact url', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_PROJECTS_URL',
      'https://projects.staging.example.test/workspace'
    )

    const result = buildAppsDirectory({ current: 'billing' })

    expect(result).toEqual([
      { name: '876 Billing', url: '/', current: true },
      {
        name: '876 Projects',
        url: 'https://projects.staging.example.test/workspace',
      },
    ])
  })

  it('omits an app whose origin variable is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.example.test')
    vi.stubEnv('NEXT_PUBLIC_COURIERS_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_CRM_URL', undefined)

    const result = buildAppsDirectory({ current: 'couriers' })

    expect(result).toEqual([
      { name: '876 Billing', url: 'https://billing.example.test' },
      { name: '876 Couriers', url: '/', current: true },
    ])
  })

  it('treats a blank origin variable as unset', () => {
    vi.stubEnv('NEXT_PUBLIC_INVOICE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_COMMERCE_URL', '   ')

    const result = buildAppsDirectory({ current: 'console' })

    expect(result).toEqual([{ name: '876 Console', url: '/', current: true }])
  })

  it('never substitutes a hardcoded 876.app origin for an unset app', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_COURIERS_URL', undefined)

    const result = buildAppsDirectory({ current: 'crm' })

    expect(result).toEqual([{ name: '876 CRM', url: '/', current: true }])
    expect(result.some((entry) => entry.url.includes('876.app'))).toBe(false)
  })

  it('keeps the current app when its own origin variable is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.example.test')
    vi.stubEnv('NEXT_PUBLIC_CRM_URL', undefined)

    const result = buildAppsDirectory({ current: 'crm' })

    expect(result).toEqual([
      { name: '876 Billing', url: 'https://billing.example.test' },
      { name: '876 CRM', url: '/', current: true },
    ])
  })

  it('marks exactly one entry as current', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.example.test')
    vi.stubEnv('NEXT_PUBLIC_PROJECTS_URL', 'https://projects.example.test')

    const result = buildAppsDirectory({ current: 'projects' })

    expect(result.map((entry) => entry.current)).toEqual([undefined, true])
  })

  it('keeps the declared order across repeated calls with the same environment', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.example.test')
    vi.stubEnv('NEXT_PUBLIC_INVOICE_URL', 'https://invoice.example.test')
    vi.stubEnv('NEXT_PUBLIC_COMMERCE_URL', 'https://commerce.example.test')

    const first = buildAppsDirectory({ current: 'billing' })
    const second = buildAppsDirectory({ current: 'billing' })

    expect(second).toEqual(first)
    expect(first.map((entry) => entry.name)).toEqual([
      '876 Billing',
      '876 Invoice',
      '876 Commerce',
    ])
  })

  it('covers every registered platform app when all origins are configured', () => {
    for (const envName of Object.values(ORIGIN_ENV)) {
      vi.stubEnv(envName, `https://${envName.toLowerCase()}.example.test`)
    }

    const result = buildAppsDirectory({ current: 'consumer' })

    expect(result).toHaveLength(Object.keys(PLATFORM_APP_SLUGS).length)
    expect(result.map((entry) => entry.name)).toEqual([
      '876',
      '876 Billing',
      '876 Couriers',
      '876 CRM',
      '876 Projects',
      '876 Invoice',
      '876 Enterprise',
      '876 Console',
      '876 Commerce',
    ])
  })
})
