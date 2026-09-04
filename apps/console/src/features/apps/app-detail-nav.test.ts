import { describe, expect, it } from 'vitest'

import { getAppTabs } from './app-detail-nav'

const base = '/apps/876-console'

describe('getAppTabs', () => {
  it('returns the internal application tabs in order', () => {
    expect(getAppTabs('internal', base).map((tab) => tab.label)).toEqual([
      'Overview',
      'Widgets',
      'Feature Flags',
      'Settings',
    ])
  })

  it('returns the product application tabs in order', () => {
    expect(getAppTabs('product', base).map((tab) => tab.label)).toEqual([
      'Overview',
      'Operations',
      'Modules',
      'Plans',
      'Subscribers',
      'Widgets',
      'Feature Flags',
      'Audit',
      'Provisioning',
      'Settings',
    ])
  })

  it('returns the platform application tabs in order', () => {
    expect(getAppTabs('platform', base).map((tab) => tab.label)).toEqual([
      'Overview',
      'Modules',
      'Widgets',
      'Feature Flags',
      'Settings',
    ])
  })
})
