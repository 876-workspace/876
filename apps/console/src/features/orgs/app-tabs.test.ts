import * as React from 'react'
import { describe, expect, it } from 'vitest'
import type { RouteTabItem } from '@876/ui/route-tabs'

import { ALWAYS_PRESENT_TABS, APP_OWNED_TABS, orgTabs } from './app-tabs'

const ORG_SLUG = 'test-org'
const BASE = '/orgs/test-org'

/** The five tabs every organization has, in their fixed visual order. */
const ALWAYS_PRESENT = [
  'Profile',
  'Members',
  'Customers',
  'Requests',
  'Activity',
]

function getTabLabelText(tab: RouteTabItem): string {
  if (typeof tab.label === 'string') return tab.label
  if (
    React.isValidElement(tab.label) &&
    tab.label.props &&
    typeof (tab.label.props as { name?: string }).name === 'string'
  ) {
    return (tab.label.props as { name: string }).name
  }
  return ''
}

describe('orgTabs', () => {
  it('renders exactly the always-present tabs when nothing is entitled', () => {
    expect(orgTabs(ORG_SLUG, []).map(getTabLabelText)).toEqual(ALWAYS_PRESENT)
  })

  it('shows dynamic CRM app tab for a CRM-only organization', () => {
    const labels = orgTabs(ORG_SLUG, ['876-crm']).map(getTabLabelText)

    expect(labels).toContain('876 CRM')
    expect(labels).not.toContain('Workspaces')
  })

  it('links dynamic app tabs to their corresponding workspace surfaces', () => {
    const tabs = orgTabs(ORG_SLUG, ['876-crm', '876-billing'])
    const crmTab = tabs.find((tab) => getTabLabelText(tab) === '876 CRM')
    const billingTab = tabs.find(
      (tab) => getTabLabelText(tab) === '876 Billing'
    )

    expect(crmTab?.href).toBe('/workspace/test-org/crm?from=%2Forgs%2Ftest-org')
    expect(billingTab?.href).toBe(
      '/workspace/test-org/billing?from=%2Forgs%2Ftest-org'
    )
  })

  it('renders dynamic app tabs in between Customers and Requests', () => {
    const tabs = orgTabs(ORG_SLUG, [
      {
        slug: '876-crm',
        name: '876 CRM',
        logoUrl: 'https://assets.test/crm.png',
      },
      { slug: '876-billing', name: '876 Billing', logoUrl: null },
    ])
    const labels = tabs.map(getTabLabelText)

    expect(labels).toEqual([
      'Profile',
      'Members',
      'Customers',
      '876 CRM',
      '876 Billing',
      'Requests',
      'Activity',
    ])
  })

  it('is unaffected by duplicate entitlements', () => {
    const tabs = orgTabs(ORG_SLUG, ['876-crm', '876-crm'])
    const crmTabs = tabs.filter((tab) => getTabLabelText(tab) === '876 CRM')

    expect(crmTabs).toHaveLength(1)
  })

  it('builds the Profile href from the base alone and marks it exact', () => {
    const profile = orgTabs(ORG_SLUG, []).find(
      (tab) => getTabLabelText(tab) === 'Profile'
    )

    expect(profile?.href).toBe(BASE)
    expect(profile?.exact).toBe(true)
  })

  it('marks no tab but Profile as exact', () => {
    const exact = orgTabs(ORG_SLUG, ['876-crm', '876-billing'])
      .filter((tab) => tab.exact)
      .map(getTabLabelText)

    expect(exact).toEqual(['Profile'])
  })
})

describe('APP_OWNED_TABS registry', () => {
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
