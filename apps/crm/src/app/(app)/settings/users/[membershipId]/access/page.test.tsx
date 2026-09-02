// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AccessAppEntry } from '@876/access-ui/types'

import type { AppMembership, AppRole } from '../../_lib/types'
import MemberAccessPage from './page'

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(),
  resolveViewer: vi.fn(),
  getWorkspace: vi.fn(),
  listRoles: vi.fn(),
  loadMemberships: vi.fn(),
}))

vi.mock('@/lib/auth/require-crm-context', () => ({
  requireCrmContext: mocks.requireContext,
}))
vi.mock('@/lib/auth/app-access', () => ({
  resolveCrmAccessViewer: mocks.resolveViewer,
}))
vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: mocks.getWorkspace,
}))
vi.mock('../../_data', () => ({
  loadMemberAppMemberships: mocks.loadMemberships,
}))
vi.mock('../_components/member-access-panel', () => ({
  MemberAccessPanel: ({
    entries,
    readOnly,
  }: {
    entries: AccessAppEntry[]
    readOnly: boolean
  }) => (
    <div data-testid="access-panel" data-read-only={String(readOnly)}>
      {entries.map((entry) => (
        <span key={entry.appId}>
          {entry.appName}:{entry.roles.map((role) => role.name).join(',')}:
          {entry.catalog.length}
        </span>
      ))}
    </div>
  ),
}))

function membership(overrides: Partial<AppMembership> = {}): AppMembership {
  return {
    object: 'app_membership',
    id: 'assign_1',
    organization_id: 'org_1',
    user_id: 'usr_1',
    membership_id: 'mem_1',
    app_id: 'app_crm',
    app_slug: '876-crm',
    app_name: 'CRM',
    status: 'active',
    assigned: true,
    entitled: true,
    app_role: null,
    permission_grants: [],
    permission_denies: [],
    effective_permissions: [],
    title: null,
    attributes: null,
    assigned_by: null,
    assigned_at: null,
    last_access_at: null,
    revoked_at: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

function role(overrides: Partial<AppRole> = {}): AppRole {
  return {
    object: 'app_role',
    id: 'role_1',
    app_id: 'app_crm',
    organization_id: 'org_1',
    key: 'agent',
    name: 'Agent',
    description: null,
    permissions: [],
    is_system: true,
    is_default: false,
    template_key: null,
    position: 1,
    members_count: 0,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

describe('MemberAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.resolveViewer.mockResolvedValue({ canManageAppAccess: true })
    mocks.getWorkspace.mockResolvedValue({
      orgAppRoles: { list: mocks.listRoles },
    })
    mocks.loadMemberships.mockResolvedValue({
      memberships: [membership()],
      error: null,
    })
    mocks.listRoles.mockResolvedValue({
      data: { data: [role()] },
      error: null,
    })
  })

  it('maps memberships, organization roles, and the permission catalog', async () => {
    render(
      await MemberAccessPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )

    expect(screen.getByText(/CRM:Agent:[1-9]/)).toBeInTheDocument()
  })

  it('loads roles through orgAppRoles with exact organization and app ids', async () => {
    await MemberAccessPage({
      params: Promise.resolve({ membershipId: 'mem_1' }),
    })

    expect(mocks.listRoles).toHaveBeenCalledTimes(1)
    expect(mocks.listRoles).toHaveBeenCalledWith('org_1', 'app_crm')
  })

  it('passes read-only mode when the viewer cannot assign apps', async () => {
    mocks.resolveViewer.mockResolvedValue({ canManageAppAccess: false })

    render(
      await MemberAccessPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )

    expect(screen.getByTestId('access-panel')).toHaveAttribute(
      'data-read-only',
      'true'
    )
  })

  it('keeps a catalog-less app in the access panel', async () => {
    mocks.loadMemberships.mockResolvedValue({
      memberships: [
        membership({ app_slug: 'unknown-app', app_name: 'Unknown' }),
      ],
      error: null,
    })

    render(
      await MemberAccessPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )

    expect(screen.getByText('Unknown:Agent:0')).toBeInTheDocument()
  })

  it('renders a membership failure without requesting roles', async () => {
    mocks.loadMemberships.mockResolvedValue({
      memberships: [],
      error: { code: 'core/unavailable', message: 'Memberships unavailable.' },
    })

    render(
      await MemberAccessPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )

    expect(screen.getByText('Memberships unavailable.')).toBeInTheDocument()
    expect(screen.queryByTestId('access-panel')).toBeNull()
    expect(mocks.listRoles).not.toHaveBeenCalled()
  })

  it('shows one role failure without hiding the other apps', async () => {
    mocks.loadMemberships.mockResolvedValue({
      memberships: [
        membership(),
        membership({
          id: 'assign_2',
          app_id: 'app_invoice',
          app_slug: '876-invoice',
          app_name: 'Invoice',
        }),
      ],
      error: null,
    })
    mocks.listRoles.mockImplementation(async (_orgId: string, appId: string) =>
      appId === 'app_crm'
        ? {
            data: null,
            error: { code: 'core/unavailable', message: 'Roles unavailable.' },
          }
        : { data: { data: [role({ app_id: appId })] }, error: null }
    )

    render(
      await MemberAccessPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )

    expect(screen.getByText('Roles unavailable.')).toBeInTheDocument()
    expect(screen.getByText(/CRM::[1-9]/)).toBeInTheDocument()
    expect(screen.getByText(/Invoice:Agent:[1-9]/)).toBeInTheDocument()
  })
})
