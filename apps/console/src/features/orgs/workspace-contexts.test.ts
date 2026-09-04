import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveOrg: vi.fn(),
  resolveWorkspaceNavigation: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./org-data', () => ({ resolveOrg: mocks.resolveOrg }))
vi.mock('./workspace-navigation', () => ({
  resolveWorkspaceNavigation: mocks.resolveWorkspaceNavigation,
}))

import { contextEntries } from '@/components/shell/sidebar-context'
import { workspaceSectionLinks, findAppWorkspace } from './app-workspaces'
import { resolveWorkspaceContexts } from './workspace-contexts'

const CRM = findAppWorkspace('crm')!

// hasAnyProductPermission() only checks for the `<shortSlug>/` namespace
// prefix; the exact key doesn't matter for these tests.
const CRM_PERMISSIONS = ['crm/requests.view']

describe('resolveWorkspaceContexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({ id: 'org_1', name: 'Acme Ltd' })
    mocks.resolveWorkspaceNavigation.mockResolvedValue([])
  })

  it('contributes no context for a path with no workspace segment', async () => {
    await expect(
      resolveWorkspaceContexts('acme', [], CRM_PERMISSIONS)
    ).resolves.toEqual([])
    expect(mocks.resolveOrg).not.toHaveBeenCalled()
  })

  it('contributes no context for an unknown product', async () => {
    await expect(
      resolveWorkspaceContexts('acme', ['not-a-product'], CRM_PERMISSIONS)
    ).resolves.toEqual([])
    expect(mocks.resolveWorkspaceNavigation).not.toHaveBeenCalled()
  })

  it('names the product and the organization it belongs to', async () => {
    const [context] = await resolveWorkspaceContexts(
      'acme',
      ['crm'],
      CRM_PERMISSIONS
    )

    expect(context?.title).toBe('876 CRM')
    expect(context?.subtitle).toBe('Acme Ltd')
    expect(context?.href).toBe('/workspace/acme/crm')
    expect(context?.kind).toBe('workspace')
  })

  it('uses the organization-resolved navigation when there is any', async () => {
    mocks.resolveWorkspaceNavigation.mockResolvedValue([
      {
        key: 'requests',
        label: 'Requests',
        href: '/workspace/acme/crm/requests',
        iconKey: 'requests',
        exact: false,
      },
    ])

    const [context] = await resolveWorkspaceContexts(
      'acme',
      ['crm'],
      CRM_PERMISSIONS
    )

    expect(contextEntries(context!).map((entry) => entry.href)).toEqual([
      '/workspace/acme/crm/requests',
    ])
    expect(mocks.resolveWorkspaceNavigation).toHaveBeenCalledWith(
      'acme',
      'org_1',
      CRM
    )
  })

  // Navigation is chrome, and an operator is usually in a workspace precisely
  // because something is wrong with it — an empty rail would strand them.
  it('falls back to the registry sections when navigation resolves to nothing', async () => {
    const [context] = await resolveWorkspaceContexts(
      'acme',
      ['crm'],
      CRM_PERMISSIONS
    )

    expect(contextEntries(context!).map((entry) => entry.href)).toEqual(
      workspaceSectionLinks('acme', CRM).map((link) => link.href)
    )
  })

  it('still names the workspace when the organization cannot be resolved', async () => {
    mocks.resolveOrg.mockResolvedValue(null)

    const [context] = await resolveWorkspaceContexts(
      'acme',
      ['crm'],
      CRM_PERMISSIONS
    )

    expect(context?.subtitle).toBe('acme')
    expect(mocks.resolveWorkspaceNavigation).not.toHaveBeenCalled()
    expect(contextEntries(context!).length).toBeGreaterThan(0)
  })

  it('ignores segments below the product when choosing the context', async () => {
    const [deep] = await resolveWorkspaceContexts(
      'acme',
      ['crm', 'requests', 'req_1'],
      CRM_PERMISSIONS
    )

    expect(deep?.href).toBe('/workspace/acme/crm')
  })

  // §6.2's AND: an operator without any projected permission for this
  // product still gets a named context (so they know where they are and can
  // navigate back up), but with no entries at all — never the registry's
  // fallback sections, and never the org-resolved navigation.
  it('names the workspace but contributes no entries when the operator holds no permission for the product', async () => {
    mocks.resolveWorkspaceNavigation.mockResolvedValue([
      {
        key: 'requests',
        label: 'Requests',
        href: '/workspace/acme/crm/requests',
        iconKey: 'requests',
        exact: false,
      },
    ])

    const [context] = await resolveWorkspaceContexts(
      'acme',
      ['crm'],
      ['billing/customers.view']
    )

    expect(context?.title).toBe('876 CRM')
    expect(context?.subtitle).toBe('Acme Ltd')
    expect(contextEntries(context!)).toEqual([])
    expect(mocks.resolveWorkspaceNavigation).not.toHaveBeenCalled()
  })

  it('names the workspace but contributes no entries when the operator holds no permissions at all', async () => {
    const [context] = await resolveWorkspaceContexts('acme', ['crm'], [])

    expect(contextEntries(context!)).toEqual([])
  })
})
