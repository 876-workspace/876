import { describe, expect, it } from 'vitest'

import { customerTabs } from './customer-tabs'

describe('customerTabs', () => {
  it('returns eight tabs anchored to the given base in order', () => {
    const base = '/nkr-express/customers/cprof_123'
    const tabs = customerTabs(base)

    expect(tabs).toEqual([
      { label: 'Overview', href: base, exact: true },
      { label: 'Addresses', href: `${base}/addresses` },
      { label: 'Packages', href: `${base}/packages` },
      { label: 'Deliveries', href: `${base}/deliveries` },
      { label: 'Invoices', href: `${base}/invoices` },
      { label: 'Payments', href: `${base}/payments` },
      { label: 'Notes', href: `${base}/notes` },
      { label: 'Activity', href: `${base}/activity` },
    ])
  })

  it('marks only the overview tab as exact', () => {
    const tabs = customerTabs('/org/customers/c1')
    expect(tabs.filter((t) => (t as { exact?: boolean }).exact)).toHaveLength(1)
    expect(tabs[0]?.exact).toBe(true)
  })

  it('builds every href under the supplied base', () => {
    const base = '/acme/customers/c_99'
    for (const tab of customerTabs(base)) {
      expect(tab.href.startsWith(base)).toBe(true)
    }
  })

  it('returns a fresh array on each call', () => {
    const base = '/org/customers/c1'
    const first = customerTabs(base)
    const second = customerTabs(base)
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })
})
