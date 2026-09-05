import type { NavGroupDefinition } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import {
  contextEntries,
  entryOpensContext,
  PLATFORM_CONTEXT_KEY,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
  type SidebarContextDefinition,
} from '@/components/shell/sidebar-context'

const navigation: readonly NavGroupDefinition[] = [
  {
    key: 'primary',
    entries: [
      { key: 'dashboards', title: 'Dashboards', href: '/', icon: 'dashboard' },
      { key: 'users', title: 'Users', href: '/users', icon: 'users' },
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
        colorClassName: 'text-indigo-500',
        activeClassName: 'bg-indigo-500/12',
        children: [
          {
            key: 'projects-overview',
            title: 'Overview',
            href: '/projects',
            icon: 'dashboard',
          },
          {
            key: 'projects-issues',
            title: 'Issues',
            href: '/projects/issues',
            icon: 'issues',
          },
        ],
      },
    ],
  },
  {
    key: 'platform',
    entries: [
      { key: 'storage', title: 'Storage', href: '/storage', icon: 'storage' },
    ],
  },
]

const storageContext: SidebarContextDefinition = {
  key: 'storage',
  kind: 'product',
  backLabel: 'Storage',
  title: 'Storage',
  href: '/storage',
  icon: 'storage',
  parentKey: PLATFORM_CONTEXT_KEY,
  groups: [],
}

const workspaceContext: SidebarContextDefinition = {
  key: 'storage-workspace',
  kind: 'workspace',
  backLabel: 'Acme storage',
  title: 'Acme storage',
  href: '/storage/acme',
  parentKey: 'storage',
  groups: [
    {
      key: 'items',
      entries: [
        {
          key: 'files',
          title: 'Files',
          href: '/storage/acme/files',
          icon: 'storage',
        },
      ],
    },
  ],
}

function keys(pathname: string, declared: SidebarContextDefinition[] = []) {
  return resolveSidebarContextStack(pathname, navigation, declared).map(
    (context) => context.key
  )
}

describe('resolveSidebarContextStack', () => {
  describe('the platform root', () => {
    it('returns only the platform context for a path no context claims', () => {
      expect(keys('/users')).toEqual([PLATFORM_CONTEXT_KEY])
    })

    it('keeps the registry groups so the rail can render its dividers', () => {
      const [platform] = resolveSidebarContextStack('/users', navigation)

      expect(platform?.groups.map((group) => group.key)).toEqual([
        'primary',
        'platform',
      ])
      expect(platform?.parentKey).toBeNull()
      expect(platform?.kind).toBe('platform')
    })

    it('returns the platform context alone for empty navigation', () => {
      const stack = resolveSidebarContextStack('/users', [])

      expect(stack.map((context) => context.key)).toEqual([
        PLATFORM_CONTEXT_KEY,
      ])
      expect(stack[0]?.groups).toEqual([])
    })

    it('keeps Console for return controls without rendering it as the root title', () => {
      const [platform] = resolveSidebarContextStack('/users', navigation)

      expect(platform?.title).toBe('')
      expect(platform?.backLabel).toBe('Console')
    })

    it('keeps the root href at the Console home route', () => {
      const [platform] = resolveSidebarContextStack('/users', navigation)

      expect(platform?.href).toBe('/')
    })

    it('keeps the root parentless after removing its label', () => {
      const [platform] = resolveSidebarContextStack('/users', navigation)

      expect(platform?.parentKey).toBeNull()
    })
  })

  describe('sections implied by an entry with children', () => {
    it('keeps an informative label for a drill-down section', () => {
      const [, projects] = resolveSidebarContextStack('/projects', navigation)

      expect(projects?.title).toBe('Projects')
    })

    it('keeps the drill-down section attached to the root', () => {
      const [, projects] = resolveSidebarContextStack('/projects', navigation)

      expect(projects?.parentKey).toBe(PLATFORM_CONTEXT_KEY)
    })

    it('keeps the drill-down section href informative', () => {
      const [, projects] = resolveSidebarContextStack('/projects', navigation)

      expect(projects?.href).toBe('/projects')
    })
    it('opens the section for the section root', () => {
      expect(keys('/projects')).toEqual([PLATFORM_CONTEXT_KEY, 'projects'])
    })

    it('opens the section for a child path', () => {
      expect(keys('/projects/issues')).toEqual([
        PLATFORM_CONTEXT_KEY,
        'projects',
      ])
    })

    it('opens the section for a record page beneath a child', () => {
      expect(keys('/projects/issues/iss_1')).toEqual([
        PLATFORM_CONTEXT_KEY,
        'projects',
      ])
    })

    it('inherits the parent entry tint so the open rail reads as one section', () => {
      const [, section] = resolveSidebarContextStack('/projects', navigation)

      expect(section?.colorClassName).toBe('text-indigo-500')
      expect(section?.activeClassName).toBe('bg-indigo-500/12')
      expect(section?.icon).toBe('projects')
      expect(section?.kind).toBe('section')
    })

    it('does not open a section for a path that merely shares a prefix string', () => {
      expect(keys('/projectsomething')).toEqual([PLATFORM_CONTEXT_KEY])
    })
  })

  describe('declared contexts', () => {
    it('opens a declared context that has no entries at all', () => {
      expect(keys('/storage', [storageContext])).toEqual([
        PLATFORM_CONTEXT_KEY,
        'storage',
      ])
    })

    it('keeps an empty declared context empty rather than dropping it', () => {
      const [, storage] = resolveSidebarContextStack('/storage', navigation, [
        storageContext,
      ])

      expect(storage?.groups).toEqual([])
      expect(contextEntries(storage!)).toEqual([])
    })

    it('nests a context under its declared parent, deepest last', () => {
      expect(
        keys('/storage/acme/files', [storageContext, workspaceContext])
      ).toEqual([PLATFORM_CONTEXT_KEY, 'storage', 'storage-workspace'])
    })

    it('drops a context whose declared parent is not on the stack', () => {
      const orphan: SidebarContextDefinition = {
        ...workspaceContext,
        parentKey: 'nonexistent',
      }

      expect(keys('/storage/acme/files', [storageContext, orphan])).toEqual([
        PLATFORM_CONTEXT_KEY,
        'storage',
      ])
    })
  })
})

describe('resolveSidebarBackContext', () => {
  it('returns the immediate parent, not the root, from a nested context', () => {
    const stack = resolveSidebarContextStack(
      '/storage/acme/files',
      navigation,
      [storageContext, workspaceContext]
    )

    expect(resolveSidebarBackContext(stack, 'storage-workspace')?.key).toBe(
      'storage'
    )
  })

  it('returns the platform context from a first-level context', () => {
    const stack = resolveSidebarContextStack('/projects', navigation)

    expect(resolveSidebarBackContext(stack, 'projects')?.key).toBe(
      PLATFORM_CONTEXT_KEY
    )
  })

  it('returns null at the root, so the root shows no back control', () => {
    const stack = resolveSidebarContextStack('/users', navigation)

    expect(resolveSidebarBackContext(stack, PLATFORM_CONTEXT_KEY)).toBeNull()
  })

  it('returns null for a key that is not on the stack', () => {
    const stack = resolveSidebarContextStack('/users', navigation)

    expect(resolveSidebarBackContext(stack, 'projects')).toBeNull()
  })
})

describe('entryOpensContext', () => {
  const contexts = sidebarContexts(navigation, [storageContext])
  const entries = contextEntries(contexts[0]!)
  const entry = (key: string) => entries.find((item) => item.key === key)!

  it('is true for an entry whose children imply a context', () => {
    expect(entryOpensContext(entry('projects'), contexts)).toBe(true)
  })

  it('is true for an entry matched by a separately declared context', () => {
    expect(entryOpensContext(entry('storage'), contexts)).toBe(true)
  })

  it('is false for an entry that only navigates', () => {
    expect(entryOpensContext(entry('users'), contexts)).toBe(false)
  })

  it('is false when the only match is the platform context itself', () => {
    expect(entryOpensContext(entry('dashboards'), contexts)).toBe(false)
  })
})

describe('resolveActiveEntryKey', () => {
  const [, section] = resolveSidebarContextStack('/projects', navigation)

  it('prefers the longest matching entry over a shared prefix', () => {
    expect(resolveActiveEntryKey('/projects/issues', section!)).toBe(
      'projects-issues'
    )
  })

  it('keeps a record page attributed to its list entry', () => {
    expect(resolveActiveEntryKey('/projects/issues/iss_1', section!)).toBe(
      'projects-issues'
    )
  })

  it('matches the index entry at the context root', () => {
    expect(resolveActiveEntryKey('/projects', section!)).toBe(
      'projects-overview'
    )
  })

  it('returns null when no entry owns the path', () => {
    expect(resolveActiveEntryKey('/users', section!)).toBeNull()
  })

  it('returns null for a context with no entries', () => {
    const [, storage] = resolveSidebarContextStack('/storage', navigation, [
      storageContext,
    ])

    expect(resolveActiveEntryKey('/storage', storage!)).toBeNull()
  })
})
