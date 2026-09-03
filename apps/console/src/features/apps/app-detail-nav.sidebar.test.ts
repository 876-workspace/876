import { describe, expect, it } from 'vitest'

import { PLATFORM_CONTEXT_KEY } from '@/components/shell/sidebar-context'
import { resolveSidebarContextStack } from '@/components/shell/sidebar-context'
import {
  appDetailSections,
  appSidebarContext,
  getAppTabs,
} from './app-detail-nav'

const navigation = [
  {
    key: 'platform',
    entries: [{ key: 'apps', title: 'Apps', href: '/apps', icon: 'apps' }],
  },
]

describe('appSidebarContext', () => {
  it('carries one entry per section of that app kind, in the same order', () => {
    const context = appSidebarContext('product', '876-crm', '876 CRM')

    expect(context.groups[0]?.entries.map((entry) => entry.title)).toEqual(
      appDetailSections('product').map((section) => section.label)
    )
  })

  it('agrees with the tab strip on every href, so the two cannot drift', () => {
    const context = appSidebarContext('product', '876-crm', '876 CRM')

    expect(context.groups[0]?.entries.map((entry) => entry.href)).toEqual(
      getAppTabs('product', '/apps/876-crm').map((tab) => tab.href)
    )
  })

  it('names the app rather than a generic label, since it titles the rail', () => {
    expect(
      appSidebarContext('internal', '876-console', '876 Console').title
    ).toBe('876 Console')
  })

  it('holds only the internal sections for an internal app', () => {
    const context = appSidebarContext('internal', '876-console', 'Console')

    expect(context.groups[0]?.entries.map((entry) => entry.title)).toEqual([
      'Overview',
      'Widgets',
      'Feature Flags',
      'Settings',
    ])
  })

  it('declares a key per app, so two records cannot share a context', () => {
    expect(appSidebarContext('product', '876-crm', 'CRM').key).not.toBe(
      appSidebarContext('product', '876-work', 'Work').key
    )
  })
})

describe('the product context in the sidebar stack', () => {
  const context = appSidebarContext('product', '876-crm', '876 CRM')

  it('opens on the app record itself', () => {
    expect(
      resolveSidebarContextStack('/apps/876-crm', navigation, [context]).map(
        (item) => item.key
      )
    ).toEqual([PLATFORM_CONTEXT_KEY, 'app-876-crm'])
  })

  it('stays open in every section beneath the record', () => {
    expect(
      resolveSidebarContextStack(
        '/apps/876-crm/plans/pro/pricing',
        navigation,
        [context]
      ).map((item) => item.key)
    ).toEqual([PLATFORM_CONTEXT_KEY, 'app-876-crm'])
  })

  it('does not open on the apps list', () => {
    expect(
      resolveSidebarContextStack('/apps', navigation, [context]).map(
        (item) => item.key
      )
    ).toEqual([PLATFORM_CONTEXT_KEY])
  })

  it('returns to the platform rail on back', () => {
    const stack = resolveSidebarContextStack('/apps/876-crm', navigation, [
      context,
    ])

    expect(stack[0]?.key).toBe(PLATFORM_CONTEXT_KEY)
    expect(stack[1]?.parentKey).toBe(PLATFORM_CONTEXT_KEY)
  })
})
