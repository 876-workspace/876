import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  labels: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: { capacity: { list: mocks.list } },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.labels,
}))
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

const { EditCapacityData } = await import('./edit-capacity-data')

const CAPACITY = {
  object: 'projects.member-capacity' as const,
  id: 'cap_1',
  tenantId: 'tnt_1',
  userId: 'usr_1',
  minutesPerWeek: 2250,
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

describe('EditCapacityData', () => {
  it('prefills the week the form edits', async () => {
    render(await EditCapacityData({ orgId: 'org_1', capacityId: 'cap_1' }))

    expect(screen.getByLabelText('Hours per week')).toHaveValue('37.5')
    expect(screen.getByLabelText('Effective from')).toHaveValue('2026-09-01')
    expect(screen.getByText('Ada')).toBeInTheDocument()
  })

  it('finds the capacity even when its id arrived encoded', async () => {
    render(await EditCapacityData({ orgId: 'org_1', capacityId: 'cap%5F1' }))

    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it('answers a capacity that does not exist with not-found', async () => {
    mocks.list.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })

    render(await EditCapacityData({ orgId: 'org_1', capacityId: 'cap_9' }))

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('banners a list that could not be read', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await EditCapacityData({ orgId: 'org_1', capacityId: 'cap_1' }))

    expect(
      screen.getByText('The capacity could not be loaded')
    ).toBeInTheDocument()
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
