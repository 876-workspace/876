import type { Reminder } from '@876/projects/contracts'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/client/reminders', () => ({
  remindersClient: {
    create: mocks.create,
    update: vi.fn(),
    delete: mocks.remove,
  },
}))

const { RemindersPanel } = await import('./reminders-panel')

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    object: 'projects.reminder',
    id: 'rem_1',
    tenantId: 'tnt_1',
    issueId: 'iss_1',
    milestoneId: null,
    eventId: null,
    remindAt: null,
    offsetMinutesBeforeDue: 120,
    recurrence: null,
    channel: 'in-app',
    createdBy: 'usr_1',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ data: reminder(), error: null })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.reminder', id: 'rem_1', deleted: true },
    error: null,
  })
})

describe('RemindersPanel', () => {
  it('says when a reminder is due and never that it will be delivered', () => {
    render(
      <RemindersPanel target={{ issueId: 'iss_1' }} reminders={[reminder()]} />
    )

    expect(
      screen.getByText('Due 2 hours before the due date')
    ).toBeInTheDocument()
    expect(screen.queryByText(/notify|email|sent/i)).not.toBeInTheDocument()
  })

  it('measures an offset from the target the caller named', () => {
    render(
      <RemindersPanel
        target={{ eventId: 'evt_1' }}
        base="the start"
        reminders={[reminder({ issueId: null, eventId: 'evt_1' })]}
      />
    )

    expect(screen.getByText('Due 2 hours before the start')).toBeInTheDocument()
  })

  it('states that there are none without a paragraph of explanation', () => {
    render(<RemindersPanel target={{ issueId: 'iss_1' }} reminders={[]} />)

    expect(screen.getByText('No reminders.')).toBeInTheDocument()
  })

  it('adds a reminder for the record it was given, in the chosen unit', async () => {
    render(<RemindersPanel target={{ issueId: 'iss_1' }} reminders={[]} />)

    fireEvent.change(screen.getByLabelText('Before'), {
      target: { value: '3' },
    })
    fireEvent.change(screen.getByLabelText('Unit'), {
      target: { value: 'days' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      issueId: 'iss_1',
      offsetMinutesBeforeDue: 4_320,
    })
  })

  it('targets a meeting rather than a work item when it is on an event', async () => {
    render(<RemindersPanel target={{ eventId: 'evt_1' }} reminders={[]} />)

    fireEvent.change(screen.getByLabelText('Unit'), {
      target: { value: 'minutes' },
    })
    fireEvent.change(screen.getByLabelText('Before'), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      eventId: 'evt_1',
      offsetMinutesBeforeDue: 30,
    })
  })

  it('removes the reminder the user chose, once', async () => {
    render(
      <RemindersPanel target={{ issueId: 'iss_1' }} reminders={[reminder()]} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Remove reminder/ }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
    expect(mocks.remove).toHaveBeenCalledWith('rem_1')
  })

  it('refuses an offset that is not a positive amount', async () => {
    render(<RemindersPanel target={{ issueId: 'iss_1' }} reminders={[]} />)

    fireEvent.change(screen.getByLabelText('Before'), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }))

    expect(mocks.create).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Enter how long before the due date.')
    ).toBeInTheDocument()
  })
})
