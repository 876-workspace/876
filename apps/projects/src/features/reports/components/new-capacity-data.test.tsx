import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ labels: vi.fn() }))

vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.labels,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

const { NewCapacityData } = await import('./new-capacity-data')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.labels.mockResolvedValue({
    labels: { usr_1: 'Ada', usr_2: 'Zoe' },
    error: null,
  })
})

describe('NewCapacityData', () => {
  it('offers every member of the directory, in name order', async () => {
    render(await NewCapacityData({ orgId: 'org_1' }))

    expect(
      screen.getAllByRole('option').map(({ textContent }) => textContent)
    ).toEqual(['Choose a member', 'Ada', 'Zoe'])
  })

  it('banners a directory that could not be read', async () => {
    mocks.labels.mockResolvedValue({
      labels: {},
      error: {
        code: 'platform/unavailable',
        message: 'The directory could not be read.',
      },
    })

    render(await NewCapacityData({ orgId: 'org_1' }))

    expect(
      screen.getByText('The member list could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Hours per week')).toBeInTheDocument()
  })
})
