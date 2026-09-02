// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberPermissionsPage from './page'
const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  loadMemberships: vi.fn(),
  matrix: vi.fn(),
}))
vi.mock('@/lib/auth/context', () => ({ getInvoiceContext: mocks.getContext }))
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
const membership = (overrides = {}) => ({
  object: 'app_membership',
  id: 'assign_1',
  organization_id: 'org_1',
  user_id: 'usr_1',
  membership_id: 'mem_1',
  app_id: 'app_invoice',
  app_slug: '876-invoice',
  app_name: 'Invoice',
  status: 'active',
  assigned: true,
  entitled: true,
  app_role: { name: 'Accountant' },
  permission_grants: [],
  permission_denies: [],
  effective_permissions: ['invoices.view'],
  title: null,
  attributes: null,
  assigned_by: null,
  assigned_at: null,
  last_access_at: null,
  revoked_at: null,
  created_at: null,
  updated_at: null,
  ...overrides,
})
describe('MemberPermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.loadMemberships.mockResolvedValue({
      memberships: [membership()],
      error: null,
    })
  })
  it('renders one matrix for each entitled catalogued app', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getAllByTestId('matrix')).toHaveLength(1)
  })
  it('passes effective permissions through to the matrix', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(mocks.matrix).toHaveBeenCalledWith(
      expect.objectContaining({ held: ['invoices.view'] })
    )
  })
  it('renders a notice when an app has no catalog', async () => {
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
  it('renders role names but no editing control', async () => {
    render(
      await MemberPermissionsPage({
        params: Promise.resolve({ membershipId: 'mem_1' }),
      })
    )
    expect(screen.getByText('Accountant')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
