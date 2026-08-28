import { describe, expect, it } from 'vitest'

import { ALWAYS_PRESENT_TABS, APP_OWNED_TABS, orgTabs } from './app-tabs'

const BASE = '/orgs/test-org'

/** The seven tabs every organization has, in their fixed visual order. */
const ALWAYS_PRESENT = [
  'Overview',
  'Members',
  'Customers',
  'Subscriptions',
  'Onboarding',
  'Activity',
  'Notes',
]

describe('orgTabs', () => {
  it('renders exactly the always-present tabs when nothing is entitled', () => {
    expect(orgTabs(BASE, []).map((tab) => tab.label)).toEqual(ALWAYS_PRESENT)
  })

  it('shows Requests but not Billing for a CRM-only organization', () => {
    const labels = orgTabs(BASE, ['876-crm']).map((tab) => tab.label)

    expect(labels).toContain('Requests')
    expect(labels).not.toContain('Billing')
  })

  it('shows Billing but not Requests for a Billing-only organization', () => {
    const labels = orgTabs(BASE, ['876-billing']).map((tab) => tab.label)

    expect(labels).toContain('Billing')
    expect(labels).not.toContain('Requests')
  })

  it('places each app tab after its anchor when both are entitled', () => {
    const labels = orgTabs(BASE, ['876-crm', '876-billing']).map(
      (tab) => tab.label
    )

    expect(labels).toEqual([
      'Overview',
      'Members',
      'Customers',
      'Requests',
      'Subscriptions',
      'Onboarding',
      'Billing',
      'Activity',
      'Notes',
    ])
  })

  it('ignores an entitlement no tab is registered for', () => {
    const labels = orgTabs(BASE, ['876-couriers', 'not-an-app']).map(
      (tab) => tab.label
    )

    expect(labels).toEqual(ALWAYS_PRESENT)
  })

  it('is unaffected by the order entitlements arrive in', () => {
    const forward = orgTabs(BASE, ['876-crm', '876-billing'])
    const reversed = orgTabs(BASE, ['876-billing', '876-crm'])

    expect(reversed.map((tab) => tab.label)).toEqual(
      forward.map((tab) => tab.label)
    )
  })

  it('builds the Overview href from the base alone and marks it exact', () => {
    const overview = orgTabs(BASE, []).find((tab) => tab.label === 'Overview')

    expect(overview).toEqual({ label: 'Overview', href: BASE, exact: true })
  })

  it('builds an app tab href from its registered segment', () => {
    const requests = orgTabs(BASE, ['876-crm']).find(
      (tab) => tab.label === 'Requests'
    )

    expect(requests).toEqual({ label: 'Requests', href: `${BASE}/requests` })
  })

  it('marks no tab but Overview as exact', () => {
    const exact = orgTabs(BASE, ['876-crm', '876-billing'])
      .filter((tab) => tab.exact)
      .map((tab) => tab.label)

    expect(exact).toEqual(['Overview'])
  })
})

describe('APP_OWNED_TABS registry', () => {
  // Without this, a typo in `after` silently drops the tab from the strip
  // rather than failing anywhere — the registry is only trustworthy if a bad
  // anchor cannot ship.
  it('anchors every app tab to a real always-present tab', () => {
    const anchors = new Set<string>(ALWAYS_PRESENT_TABS.map((tab) => tab.label))

    for (const tab of APP_OWNED_TABS) {
      expect(anchors.has(tab.after)).toBe(true)
    }
  })

  it('registers every app tab exactly once', () => {
    const slugs = APP_OWNED_TABS.map((tab) => tab.appSlug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('never collides with an always-present tab label', () => {
    const baseline = new Set<string>(
      ALWAYS_PRESENT_TABS.map((tab) => tab.label)
    )

    for (const tab of APP_OWNED_TABS) {
      expect(baseline.has(tab.label)).toBe(false)
    }
  })
})
