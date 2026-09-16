import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ list: vi.fn(), labels: vi.fn() }))

vi.mock('@/lib/services/projects', () => ({
  projects: { capacity: { list: mocks.list } },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.labels,
}))

const { CapacityListData } = await import('./capacity-list-data')

const CAPACITY = {
  object: 'projects.member-capacity' as const,
  id: 'cap_1',
  tenantId: 'tnt_1',
  userId: 'usr_1',
  minutesPerWeek: 2400,
  effectiveFrom: 1788220800,
  effectiveTo: null,
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [CAPACITY] },
    error: null,
  })
  mocks.labels.mockResolvedValue({ labels: { usr_1: 'Ada' }, error: null })
})

describe('CapacityListData', () => {
  it('names the member each week of capacity belongs to', async () => {
    render(await CapacityListData({ orgId: 'org_1' }))

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('40h')).toBeInTheDocument()
  })

  it('falls back to the member id when the directory has no name', async () => {
    mocks.labels.mockResolvedValue({ labels: {}, error: null })

    render(await CapacityListData({ orgId: 'org_1' }))

    expect(screen.getByText('usr_1')).toBeInTheDocument()
  })

  it('banners a directory that could not be read and keeps the table', async () => {
    mocks.labels.mockResolvedValue({
      labels: {},
      error: {
        code: 'platform/unavailable',
        message: 'The directory could not be read.',
      },
    })

    render(await CapacityListData({ orgId: 'org_1' }))

    expect(
      screen.getByText('Some capacity data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('40h')).toBeInTheDocument()
  })

  it('banners capacity that could not be read and keeps an empty table', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await CapacityListData({ orgId: 'org_1' }))

    expect(
      screen.getByText('Some capacity data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('No capacity recorded')).toBeInTheDocument()
  })
})
