import { describe, expect, it } from 'vitest'

import { navConfig } from '@/components/shell/nav-config'

describe('navConfig', () => {
  it('keeps the unlabelled sidebar items in their requested groups', () => {
    expect(
      navConfig.map((group) => group.items.map((item) => item.title))
    ).toEqual([
      ['Dashboards', 'Users', 'Organizations', 'Requests', 'Security'],
      ['Apps', 'Widgets', 'Storage'],
      ['Reports', 'Settings'],
    ])
  })

  it('routes the platform request surface independently of the CRM product app', () => {
    expect(navConfig[0]?.items[3]).toMatchObject({
      title: 'Requests',
      href: '/requests',
    })
  })
})
