import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createCapacity: vi.fn(),
  updateCapacity: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/client/reports', () => ({
  reportsClient: {
    createCapacity: mocks.createCapacity,
    updateCapacity: mocks.updateCapacity,
  },
}))

const { CapacityForm } = await import('./capacity-form')

const MEMBERS = [
  { id: 'usr_1', label: 'Ada' },
  { id: 'usr_2', label: 'Zoe' },
]

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
  mocks.createCapacity.mockResolvedValue({ data: CAPACITY, error: null })
  mocks.updateCapacity.mockResolvedValue({ data: CAPACITY, error: null })
})

describe('CapacityForm', () => {
  it('sends the hours it holds as integer minutes', async () => {
    render(<CapacityForm mode="create" members={MEMBERS} />)

    fireEvent.change(screen.getByLabelText('Member'), {
      target: { value: 'usr_1' },
    })
    fireEvent.change(screen.getByLabelText('Hours per week'), {
      target: { value: '37.5' },
    })
    fireEvent.change(screen.getByLabelText('Effective from'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mocks.createCapacity).toHaveBeenCalledWith({
        userId: 'usr_1',
        minutesPerWeek: 2250,
        effectiveFrom: 1788220800,
        effectiveTo: null,
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/settings/capacity')
  })

  it('refuses a fraction that is not a whole number of minutes', async () => {
    render(<CapacityForm mode="create" members={MEMBERS} />)

    fireEvent.change(screen.getByLabelText('Member'), {
      target: { value: 'usr_1' },
    })
    fireEvent.change(screen.getByLabelText('Hours per week'), {
      target: { value: '37.33' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('Enter hours per week, up to 168.')
    ).toBeInTheDocument()
    expect(mocks.createCapacity).not.toHaveBeenCalled()
  })

  it('asks for the member before it can be saved', async () => {
    render(<CapacityForm mode="create" members={MEMBERS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('Choose the member this capacity applies to.')
    ).toBeInTheDocument()
    expect(mocks.createCapacity).not.toHaveBeenCalled()
  })

  it('edits the week it was given rather than asking for a member', async () => {
    render(<CapacityForm mode="edit" members={MEMBERS} capacity={CAPACITY} />)

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Member')).toBeNull()

    fireEvent.change(screen.getByLabelText('Hours per week'), {
      target: { value: '37.5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.updateCapacity).toHaveBeenCalledWith('cap_1', {
        minutesPerWeek: 2250,
        effectiveFrom: 1788220800,
        effectiveTo: null,
      })
    )
  })

  it('surfaces the service failure without navigating away', async () => {
    mocks.createCapacity.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/capacity-overlap',
        message: 'That member already has capacity for this period.',
      },
    })

    render(<CapacityForm mode="create" members={MEMBERS} />)

    fireEvent.change(screen.getByLabelText('Member'), {
      target: { value: 'usr_1' },
    })
    fireEvent.change(screen.getByLabelText('Hours per week'), {
      target: { value: '40' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText(
        'That member already has capacity for this period.'
      )
    ).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
