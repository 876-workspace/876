import { describe, expect, it } from 'vitest'

import { consoleNav } from './console-nav-config'

describe('consoleNav', () => {
  it('keeps the unlabelled sidebar items in their requested groups', () => {
    expect(
      consoleNav.map((group) => group.items.map((item) => item.title))
    ).toEqual([
      ['Dashboards', 'Users', 'Organizations'],
      ['Apps', 'Widgets', 'Storage'],
      ['Reports', 'Settings'],
    ])
  })
})
