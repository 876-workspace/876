import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listGrants: vi.fn(),
  listUsers: vi.fn(),
  listEmployees: vi.fn(),
}))

vi.mock('@/lib/service', () => ({
  service: { team: { list: mocks.listGrants } },
}))

vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    employees: { list: mocks.listEmployees },
  },
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { users: { list: mocks.listUsers } },
}))

import type { AdminEmployeeProfile } from '@876/platform/compat'

import {
  buildStaffPositionMap,
  loadTeamListData,
  resolveTeamPosition,
} from './team-list-data'

const staffGrant = {
  userId: 'user_staff',
  roleName: 'admin',
  status: 'active',
  affiliation: 'staff',
  title: null,
  expiresAt: null,
  // Prisma always returns these on a grant row; the list projects them for the
  // access panel, so a fixture without them is not a real grant.
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  role: { permissions: ['console:access', 'users:list'] },
}
const contractorGrant = {
  ...staffGrant,
  userId: 'user_contractor',
  affiliation: 'contractor',
  title: 'Consultant',
  expiresAt: BigInt(2_000_000_000),
}
const externalGrant = {
  ...staffGrant,
  userId: 'user_external',
  affiliation: 'external',
  title: 'External Auditor',
  expiresAt: BigInt(2_000_000_000),
}
const identity = {
  id: 'user_staff',
  first_name: 'Ava',
  last_name: 'Grant',
  email: 'ava@example.com',
  username: 'ava',
  avatar: null,
}
const employee: AdminEmployeeProfile = {
  object: 'employee_profile',
  id: 'employee_1',
  membership_id: 'membership_1',
  organization_id: 'org_staff',
  user_id: 'user_staff',
  job_title: 'Support Lead',
  employment_status: 'active',
  employee_number: null,
  department_id: null,
  location_id: null,
  manager_membership_id: null,
  employment_type: null,
  division: null,
  cost_center: null,
  work_email: null,
  work_phone: null,
  start_date: null,
  end_date: null,
  metadata: null,
  deleted_at: null,
  deleted_by: null,
  deletion_reason: null,
  created_at: 1_700_000_000,
  updated_at: 1_700_000_000,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CONSOLE_STAFF_ORGANIZATION_ID = 'org_staff'
  mocks.listGrants.mockResolvedValue([staffGrant])
  mocks.listUsers.mockResolvedValue({
    data: { data: [identity], object: 'list', has_more: false, url: '/users' },
    error: null,
  })
  mocks.listEmployees.mockResolvedValue({
    data: {
      data: [employee],
      object: 'list',
      has_more: false,
      url: '/employees',
    },
    error: null,
  })
})

afterEach(() => {
  delete process.env.CONSOLE_STAFF_ORGANIZATION_ID
})

describe('Team staff position enrichment', () => {
  it('skips the employee call when the staff organization id is unset', async () => {
    delete process.env.CONSOLE_STAFF_ORGANIZATION_ID
    const result = await loadTeamListData()
    expect(result.rows[0]?.position).toBeNull()
    expect(result.staffPositionsUnavailable).toBe(false)
    expect(mocks.listEmployees).not.toHaveBeenCalled()
  })

  it('calls the employee directory exactly once when configured', async () => {
    await loadTeamListData()
    expect(mocks.listEmployees).toHaveBeenCalledTimes(1)
    expect(mocks.listEmployees).toHaveBeenCalledWith('org_staff')
  })

  it('skips an employee profile whose user id is null', () => {
    const map = buildStaffPositionMap([{ ...employee, user_id: null }])
    expect([...map.entries()]).toEqual([])
  })

  it('skips an employee profile whose job title is null', () => {
    const map = buildStaffPositionMap([{ ...employee, job_title: null }])
    expect([...map.entries()]).toEqual([])
  })

  it('resolves a staff position from the employee profile map', async () => {
    const result = await loadTeamListData()
    expect(result.rows[0]?.position).toBe('Support Lead')
  })

  it('renders a missing staff position as null for the row em-dash fallback', async () => {
    mocks.listEmployees.mockResolvedValue({
      data: { data: [], object: 'list', has_more: false, url: '/employees' },
      error: null,
    })
    const result = await loadTeamListData()
    expect(result.rows[0]?.position).toBeNull()
  })

  it('uses the grant title for a contractor', async () => {
    mocks.listGrants.mockResolvedValue([contractorGrant])
    const result = await loadTeamListData()
    expect(result.rows[0]?.position).toBe('Consultant')
  })

  it('uses the grant title for an external operator', async () => {
    mocks.listGrants.mockResolvedValue([externalGrant])
    const result = await loadTeamListData()
    expect(result.rows[0]?.position).toBe('External Auditor')
  })

  it('never uses the grant title for staff', () => {
    const result = resolveTeamPosition(
      'staff',
      'user_staff',
      'Stale Console Title',
      new Map()
    )
    expect(result).toBeNull()
  })

  it('degrades employee API errors into a position notice while retaining rows', async () => {
    mocks.listEmployees.mockResolvedValue({
      data: null,
      error: { code: 'employee/unavailable', message: 'Unavailable.' },
    })
    const result = await loadTeamListData()
    expect(result.staffPositionsUnavailable).toBe(true)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.id).toBe('user_staff')
  })

  it('degrades a thrown employee lookup while retaining the Team list', async () => {
    mocks.listEmployees.mockRejectedValue(new Error('network down'))
    const result = await loadTeamListData()
    expect(result.staffPositionsUnavailable).toBe(true)
    expect(result.rows[0]?.position).toBeNull()
  })

  it('preserves an unresolved Console grant when identity enrichment misses it', async () => {
    mocks.listUsers.mockResolvedValue({
      data: { data: [], object: 'list', has_more: false, url: '/users' },
      error: null,
    })
    const result = await loadTeamListData()
    expect(result.rows[0]).toMatchObject({ id: 'user_staff', resolved: false })
  })

  it('starts the staff directory request before the grant query resolves', async () => {
    let resolveGrants: ((value: (typeof staffGrant)[]) => void) | undefined
    mocks.listGrants.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGrants = resolve
        })
    )

    const pending = loadTeamListData()
    expect(mocks.listEmployees).toHaveBeenCalledTimes(1)
    resolveGrants?.([staffGrant])
    await pending
  })

  it('uses one employee request for multiple staff rows rather than one per row', async () => {
    mocks.listGrants.mockResolvedValue([
      staffGrant,
      { ...staffGrant, userId: 'user_staff_2' },
      { ...staffGrant, userId: 'user_staff_3' },
    ])
    await loadTeamListData()
    expect(mocks.listEmployees).toHaveBeenCalledTimes(1)
  })

  it('batches identity resolution once for the complete grant id set', async () => {
    mocks.listGrants.mockResolvedValue([
      staffGrant,
      contractorGrant,
      externalGrant,
    ])
    await loadTeamListData('active')
    expect(mocks.listUsers).toHaveBeenCalledTimes(1)
    expect(mocks.listUsers).toHaveBeenCalledWith({
      ids: ['user_staff', 'user_contractor', 'user_external'],
      limit: 3,
    })
    expect(mocks.listGrants).toHaveBeenCalledWith({ status: 'active' })
  })
})
