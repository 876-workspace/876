import { billingNavigation } from '@876/billing/navigation'
import { describe, expect, it } from 'vitest'

import { BILLING_NAV_ICONS, resolveBillingNavIcon } from './nav-icons'

const declaredKeys = billingNavigation.flatMap((group) =>
  group.entries.map((entry) => entry.icon)
)

describe('Billing sidebar icons', () => {
  it('registers every declared top-level navigation icon', () => {
    for (const key of declaredKeys) expect(BILLING_NAV_ICONS[key]).toBeDefined()
  })

  it('resolves every top-level rail entry to a distinct icon component', () => {
    const icons = declaredKeys.map(resolveBillingNavIcon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
