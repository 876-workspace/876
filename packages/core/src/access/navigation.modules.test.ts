import { describe, expect, it } from 'vitest'

import type { AccessContext } from './context'
import { defineNavigation, resolveNavigation } from './navigation'

function context(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'user_test' },
    modules: [],
    permissions: [],
    features: [],
    experiments: {},
    ...overrides,
  }
}

const groups = defineNavigation([
  {
    key: 'main',
    entries: [
      {
        key: 'issues',
        title: 'Issues',
        href: '/issues',
        icon: 'issues',
        requires: { module: 'issues', permission: 'issues.view' },
      },
    ],
  },
])

describe('module-aware navigation', () => {
  it('keeps an entry when module and permission requirements both pass', () => {
    const result = resolveNavigation(
      groups,
      context({ modules: ['issues'], permissions: ['issues.view'] })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/issues'])
  })

  it('hides an entry when permission passes but its module is unavailable', () => {
    const result = resolveNavigation(
      groups,
      context({ permissions: ['issues.view'] })
    )

    expect(result).toEqual([])
  })

  it('hides an entry when the module is available but permission is missing', () => {
    const result = resolveNavigation(groups, context({ modules: ['issues'] }))

    expect(result).toEqual([])
  })

  it('preserves the module requirement in the resolved RSC-safe shape', () => {
    const result = resolveNavigation(
      groups,
      context({ modules: ['issues'], permissions: ['issues.view'] })
    )

    expect(result[0]?.entries[0]?.requires).toEqual({
      module: 'issues',
      permission: 'issues.view',
    })
  })
})
