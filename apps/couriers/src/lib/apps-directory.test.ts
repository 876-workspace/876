import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAppsDirectory } from './apps-directory'

describe('getAppsDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('marks Couriers current and uses the organization base path', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', 'https://billing.internal.876.test')

    const result = getAppsDirectory('/org/island-logistics')

    expect(result).toEqual([
      {
        name: '876 Couriers',
        url: '/org/island-logistics',
        current: true,
      },
      {
        name: '876 Billing',
        url: 'https://billing.internal.876.test',
      },
    ])
  })

  it('uses the configured Billing URL when the environment variable exists', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_BILLING_URL',
      'https://billing.staging.876.test/workspace'
    )

    const result = getAppsDirectory('/org/montego-express')

    expect(result).toEqual([
      {
        name: '876 Couriers',
        url: '/org/montego-express',
        current: true,
      },
      {
        name: '876 Billing',
        url: 'https://billing.staging.876.test/workspace',
      },
    ])
  })

  it('falls back to the public Billing URL when the environment variable is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_BILLING_URL', undefined)

    const result = getAppsDirectory('/org/portland-freight')

    expect(result).toEqual([
      {
        name: '876 Couriers',
        url: '/org/portland-freight',
        current: true,
      },
      {
        name: '876 Billing',
        url: 'https://billing.876.app',
      },
    ])
  })
})
