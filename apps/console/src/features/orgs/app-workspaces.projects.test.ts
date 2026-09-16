import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { NAV_ICONS } from '@/components/shell/nav-icons'
import { findAppWorkspace } from './app-workspaces'

const validIconKeys = new Set(Object.keys(NAV_ICONS))

describe('876 Projects workspace registry', () => {
  it('registers the 876-projects workspace with correct metadata', () => {
    const workspace = findAppWorkspace('projects')
    expect(workspace).toEqual({
      appSlug: '876-projects',
      key: 'projects',
      label: '876 Projects',
      summary: 'Projects, issues, and the board this organization plans on.',
      iconKey: 'projects',
      sections: [
        { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
        { label: 'Projects', segment: 'projects', iconKey: 'projects' },
        { label: 'Issues', segment: 'issues', iconKey: 'issues' },
        { label: 'Board', segment: 'board', iconKey: 'board' },
        { label: 'Labels', segment: 'labels', iconKey: 'labels' },
        { label: 'Phases', segment: 'phases', iconKey: 'phases' },
        { label: 'Cycles', segment: 'cycles', iconKey: 'cycles' },
        {
          label: 'Task Lists',
          segment: 'task-lists',
          iconKey: 'task-lists',
        },
        { label: 'Calendar', segment: 'calendar', iconKey: 'calendar' },
        { label: 'Time', segment: 'time', iconKey: 'time' },
        { label: 'Templates', segment: 'templates', iconKey: 'templates' },
        { label: 'Layouts', segment: 'layouts', iconKey: 'layouts' },
        {
          label: 'Project Fields',
          segment: 'project-fields',
          iconKey: 'forms',
        },
      ],
    })
  })

  it('declares thirteen sections in the exact expected order', () => {
    const workspace = findAppWorkspace('projects')
    expect(workspace).toBeDefined()
    expect(workspace?.sections.map((s) => s.label)).toEqual([
      'Overview',
      'Projects',
      'Issues',
      'Board',
      'Labels',
      'Phases',
      'Cycles',
      'Task Lists',
      'Calendar',
      'Time',
      'Templates',
      'Layouts',
      'Project Fields',
    ])
    expect(workspace?.sections.map((s) => s.segment)).toEqual([
      '',
      'projects',
      'issues',
      'board',
      'labels',
      'phases',
      'cycles',
      'task-lists',
      'calendar',
      'time',
      'templates',
      'layouts',
      'project-fields',
    ])
  })

  it('ensures every section iconKey is registered in the shell icon registry', () => {
    const workspace = findAppWorkspace('projects')!
    expect(validIconKeys.has(workspace.iconKey)).toBe(true)

    for (const section of workspace.sections) {
      expect(
        validIconKeys.has(section.iconKey),
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
