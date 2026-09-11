import { describe, expect, it } from 'vitest'

import { PLATFORM_CONTEXT_KEY } from '@/components/shell/sidebar-context'
import { resolveSidebarContextStack } from '@/components/shell/sidebar-context'
import { appDetailSections, appSidebarContext } from './app-detail-nav'

const navigation = [
  {
    key: 'platform',
    entries: [{ key: 'apps', title: 'Apps', href: '/apps', icon: 'apps' }],
  },
]

describe('appSidebarContext', () => {
  it('carries one entry per section of that app kind, in the same order', () => {
    const context = appSidebarContext('product', '876-crm', '876 CRM', null)

    expect(context.groups[0]?.entries.map((entry) => entry.title)).toEqual(
      appDetailSections('product').map((section) => section.label)
    )
  })

  it('builds one href per section beneath the record', () => {
    const context = appSidebarContext('product', '876-crm', '876 CRM', null)

    expect(context.groups[0]?.entries.map((entry) => entry.href)).toEqual(
      appDetailSections('product').map(
        (section) => `/apps/876-crm${section.segment}`
      )
    )
  })

  it('names the app rather than a generic label, since it titles the rail', () => {
    expect(
      appSidebarContext('internal', '876-console', '876 Console', null).title
    ).toBe('876 Console')
  })

  it('holds only the internal sections for an internal app', () => {
    const context = appSidebarContext(
      'internal',
      '876-console',
      'Console',
      null
    )

    expect(context.groups[0]?.entries.map((entry) => entry.title)).toEqual([
      'Overview',
      'Widgets',
      'Feature Flags',
      'Settings',
    ])
  })

  it('carries the app logo URL through as plain data', () => {
    expect(
      appSidebarContext(
        'product',
        '876-crm',
        '876 CRM',
        'https://cdn.example/crm.png'
      ).logoUrl
    ).toBe('https://cdn.example/crm.png')
  })

  it('keeps a null logo as null so the rail renders initials', () => {
    expect(
      appSidebarContext('product', '876-crm', '876 CRM', null).logoUrl
    ).toBeNull()
  })

  it('declares a key per app, so two records cannot share a context', () => {
    expect(appSidebarContext('product', '876-crm', 'CRM', null).key).not.toBe(
      appSidebarContext('product', '876-work', 'Work', null).key
    )
  })
})

describe('the product context in the sidebar stack', () => {
  const context = appSidebarContext('product', '876-crm', '876 CRM', null)

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
