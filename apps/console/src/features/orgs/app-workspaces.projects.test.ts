import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { findAppWorkspace, type WorkspaceIconKey } from './app-workspaces'

const VALID_ICON_KEYS = new Set<WorkspaceIconKey>([
  'dashboard',
  'customers',
  'requests',
  'settings',
  'billing',
  'packages',
  'items',
  'teams',
  'categories',
  'forms',
  'payments',
  'banking',
  'branches',
  'warehouses',
])

describe('876 Projects workspace registry', () => {
  it('registers the 876-projects workspace with correct metadata', () => {
    const workspace = findAppWorkspace('projects')
    expect(workspace).toEqual({
      appSlug: '876-projects',
      key: 'projects',
      label: '876 Projects',
      summary: 'Projects, issues, and the board this organization plans on.',
      iconKey: 'requests',
      sections: [
        { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
        { label: 'Projects', segment: 'projects', iconKey: 'requests' },
        { label: 'Issues', segment: 'issues', iconKey: 'requests' },
        { label: 'Board', segment: 'board', iconKey: 'items' },
        { label: 'Labels', segment: 'labels', iconKey: 'categories' },
      ],
    })
  })

  it('declares five sections in the exact expected order', () => {
    const workspace = findAppWorkspace('projects')
    expect(workspace).toBeDefined()
    expect(workspace?.sections.map((s) => s.label)).toEqual([
      'Overview',
      'Projects',
      'Issues',
      'Board',
      'Labels',
    ])
    expect(workspace?.sections.map((s) => s.segment)).toEqual([
      '',
      'projects',
      'issues',
      'board',
      'labels',
    ])
  })

  it('ensures every section iconKey is a declared WorkspaceIconKey', () => {
    const workspace = findAppWorkspace('projects')!
    expect(VALID_ICON_KEYS.has(workspace.iconKey)).toBe(true)

    for (const section of workspace.sections) {
      expect(
        VALID_ICON_KEYS.has(section.iconKey),
        `Section "${section.label}" has undeclared iconKey "${section.iconKey}"`
      ).toBe(true)
    }
  })

  it('keeps the registry structurally cloneable with no functions or components', () => {
    const workspace = findAppWorkspace('projects')!
    const cloned = structuredClone(workspace)
    expect(cloned).toEqual(workspace)

    for (const section of workspace.sections) {
      expect(typeof section.label).toBe('string')
      expect(typeof section.segment).toBe('string')
      expect(typeof section.iconKey).toBe('string')
      if (section.exact !== undefined) {
        expect(typeof section.exact).toBe('boolean')
      }
    }
  })

  it('ensures every section segment has a matching route file on disk', () => {
    const workspace = findAppWorkspace('projects')!
    const rootDir = resolve(
      process.cwd(),
      'src/app/(app)/workspace/[orgSlug]/projects'
    )

    for (const section of workspace.sections) {
      const segmentDir = section.segment
        ? join(rootDir, section.segment)
        : rootDir
      const directRoute = join(segmentDir, 'page.tsx')
      const groupedRoute = join(segmentDir, '(list)', 'page.tsx')

      const exists = existsSync(directRoute) || existsSync(groupedRoute)
      expect(
        exists,
        `Section "${section.label}" (segment "${section.segment}") has no page.tsx at ${segmentDir}`
      ).toBe(true)
    }
  })
})
