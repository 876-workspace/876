import { COURIERS_MODULES } from '@876/core/modules'
import { describe, expect, it } from 'vitest'

import { COURIERS_MODULE_CATALOG } from './settings-catalog'

describe('Couriers module catalog', () => {
  it('projects canonical Couriers labels and descriptions into matching settings modules', () => {
    for (const identity of [
      COURIERS_MODULES.customers,
      COURIERS_MODULES.packages,
      COURIERS_MODULES.preAlerts,
    ]) {
      const settings = COURIERS_MODULE_CATALOG.find(
        (candidate) => candidate.key === identity.key
      )
      const description =
        settings && 'description' in settings ? settings.description : undefined

      expect({
        label: settings?.label,
        description,
      }).toEqual({
        label: identity.label,
        description: identity.description,
      })
    }
  })

  it('keeps Customers and Packages mandatory settings modules', () => {
    const mandatory = COURIERS_MODULE_CATALOG.filter(
      (module) => !module.optional
    ).map((module) => module.key)

    expect(mandatory).toContain('customers')
    expect(mandatory).toContain('packages')
  })
})
