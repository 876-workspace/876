import { describe, expect, it } from 'vitest'

import { navConfig } from '@/components/shell/nav-config'

describe('navConfig', () => {
  it('keeps the unlabelled sidebar items in their requested groups', () => {
    expect(
      navConfig.map((group) => group.items.map((item) => item.title))
    ).toEqual([
      ['Dashboards', 'Users', 'Organizations'],
      ['Apps', 'Widgets', 'Storage'],
      ['Reports', 'Settings'],
    ])
  })
})
