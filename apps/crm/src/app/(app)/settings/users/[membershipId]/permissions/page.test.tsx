// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import MemberPermissionsPage from './page'

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(),
  loadMemberships: vi.fn(),
  matrix: vi.fn(),
}))

vi.mock('@/lib/auth/require-crm-context', () => ({
  requireCrmContext: mocks.requireContext,
}))
vi.mock('../../_data', () => ({
  loadMemberAppMemberships: mocks.loadMemberships,
}))
vi.mock('@876/access-ui/permission-matrix', () => ({
  matrixModulesFromCatalog: vi.fn(() => []),
  PermissionMatrix: (props: { held: string[] }) => {
    mocks.matrix(props)
    return <div data-testid="matrix" />
  },
}))

function membership(overrides = {}) {
  return {
    object: 'app_membership' as const,
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
    app_role: { name: 'Agent' },
    permission_grants: [],
    permission_denies: [],
    effective_permissions: ['requests.view'],
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

describe('MemberPermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.loadMemberships.mockResolvedValue({
      memberships: [membership()],
      error: null,
    })
  })
  it('renders one matrix per entitled app', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getAllByTestId('matrix')).toHaveLength(1)
  })
  it('passes effective permissions to the matrix', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(mocks.matrix).toHaveBeenCalledWith(
      expect.objectContaining({ held: ['requests.view'] })
    )
  })
  it('renders the app name', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getByText('CRM')).toBeInTheDocument()
  })
  it('renders the resolved role name', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getByText('Agent')).toBeInTheDocument()
  })
  it('renders a notice for an app without a catalog', async () => {
    mocks.loadMemberships.mockResolvedValue({
      memberships: [membership({ app_slug: 'unknown', app_name: 'Unknown' })],
      error: null,
    })
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(
      screen.getByText('Permission details are not available for this app.')
    ).toBeInTheDocument()
  })
  it('renders an error value when loading fails', async () => {
    mocks.loadMemberships.mockResolvedValue({
      memberships: [],
      error: { code: 'core/unavailable', message: 'Unavailable.' },
    })
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getByText('Unavailable.')).toBeInTheDocument()
  })
  it('does not render editing controls', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
