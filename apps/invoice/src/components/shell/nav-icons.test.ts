import { invoiceNavigation } from '@876/billing/navigation'
import { describe, expect, it } from 'vitest'

import { INVOICE_NAV_ICONS, resolveInvoiceNavIcon } from './nav-icons'

const declaredKeys = invoiceNavigation.flatMap((group) =>
  group.entries.map((entry) => entry.icon)
)

describe('Invoice sidebar icons', () => {
  it('registers every declared top-level navigation icon', () => {
    for (const key of declaredKeys) expect(INVOICE_NAV_ICONS[key]).toBeDefined()
  })

  it('resolves every top-level rail entry to a distinct icon component', () => {
    const icons = declaredKeys.map(resolveInvoiceNavIcon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
