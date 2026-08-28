import { describe, expect, it } from 'vitest'

import {
  APP_WORKSPACES,
  entitledWorkspaces,
  findAppWorkspace,
  workspaceBase,
  workspaceIndex,
  workspaceSectionLinks,
} from './app-workspaces'
import { ALWAYS_PRESENT_TABS, APP_OWNED_TABS } from './app-tabs'

const SLUG = 'test-org'

describe('the workspace registry', () => {
  it('carries no icon components or functions across the RSC boundary', () => {
    for (const workspace of APP_WORKSPACES) {
      expect(typeof workspace.iconKey).toBe('string')
      for (const section of workspace.sections) {
        expect(typeof section.iconKey).toBe('string')
        expect(typeof section.label).toBe('string')
      }
    }
  })

  it('gives every workspace a unique key and a unique app slug', () => {
    const keys = APP_WORKSPACES.map((workspace) => workspace.key)
    const slugs = APP_WORKSPACES.map((workspace) => workspace.appSlug)

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every workspace exactly one index section', () => {
    for (const workspace of APP_WORKSPACES) {
      const indexes = workspace.sections.filter(
        (section) => section.segment === ''
      )
      expect(indexes).toHaveLength(1)
      expect(indexes[0].exact).toBe(true)
    }
  })

  it('does not collide with a segment the organization detail page owns', () => {
    const orgSegments = new Set<string>([
      ...ALWAYS_PRESENT_TABS.map((tab) => tab.segment),
      ...APP_OWNED_TABS.map((tab) => tab.segment),
    ])

    expect(orgSegments.has('workspace')).toBe(false)
  })
})

describe('findAppWorkspace', () => {
  it('resolves a registered key', () => {
    expect(findAppWorkspace('crm')?.appSlug).toBe('876-crm')
  })

  it('returns undefined for an unregistered key so the route can 404', () => {
    expect(findAppWorkspace('events')).toBeUndefined()
  })
})

describe('entitledWorkspaces', () => {
  it('lists nothing for an organization entitled to nothing', () => {
    expect(entitledWorkspaces([])).toEqual([])
  })

  it('lists the CRM workspace for a CRM-entitled organization', () => {
    expect(entitledWorkspaces(['876-crm']).map((w) => w.key)).toEqual(['crm'])
  })

  it('lists multiple workspaces when entitled', () => {
    expect(
      entitledWorkspaces(['876-crm', '876-billing', '876-couriers']).map(
        (w) => w.key
      )
    ).toEqual(['crm', 'billing', 'couriers'])
  })

  it('ignores an entitlement that has no workspace registered', () => {
    expect(entitledWorkspaces(['876-unregistered-app'])).toEqual([])
  })
})

describe('workspace paths', () => {
  it('builds the index and base under the organization', () => {
    expect(workspaceIndex(SLUG)).toBe('/orgs/test-org/workspace')
    expect(workspaceBase(SLUG, 'crm')).toBe('/orgs/test-org/workspace/crm')
  })

  it('links the index at the base and every other section beneath it', () => {
    const crm = findAppWorkspace('crm')!

    expect(workspaceSectionLinks(SLUG, crm)).toEqual([
      {
        label: 'Overview',
        href: '/orgs/test-org/workspace/crm',
        iconKey: 'dashboard',
        exact: true,
      },
      {
        label: 'Customers',
        href: '/orgs/test-org/workspace/crm/customers',
        iconKey: 'customers',
        exact: false,
      },
      {
        label: 'Requests',
        href: '/orgs/test-org/workspace/crm/requests',
        iconKey: 'requests',
        exact: false,
      },
    ])
  })
})
