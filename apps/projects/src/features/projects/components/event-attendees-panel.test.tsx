import type { EventAttendee } from '@876/projects/contracts'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  respond: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/client/events', () => ({
  eventsClient: {
    respondAttendee: mocks.respond,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addAttendee: vi.fn(),
    removeAttendee: vi.fn(),
  },
}))

const { EventAttendeesPanel } = await import('./event-attendees-panel')

const MEMBERS = { usr_me: 'Ada Lovelace', usr_other: 'Grace Hopper' }

function attendee(overrides: Partial<EventAttendee> = {}): EventAttendee {
  return {
    object: 'projects.event-attendee',
    id: 'att_1',
    eventId: 'evt_1',
    userId: 'usr_me',
    response: 'invited',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.respond.mockResolvedValue({
    data: attendee({ response: 'accepted' }),
    error: null,
  })
})

describe('EventAttendeesPanel', () => {
  it('shows each attendee with the answer they gave', () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[attendee({ response: 'declined' })]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('states that nobody has been invited yet', () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    expect(screen.getByText('Nobody invited yet.')).toBeInTheDocument()
  })

  it('records an acceptance for the viewer, once', async () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[attendee()]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1))
    expect(mocks.respond).toHaveBeenCalledWith('evt_1', 'usr_me', 'accepted')
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
  })

  it('records a decline', async () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[attendee()]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

    await waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1))
    expect(mocks.respond).toHaveBeenCalledWith('evt_1', 'usr_me', 'declined')
  })

  it('records a tentative answer', async () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[attendee()]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tentative' }))

    await waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1))
    expect(mocks.respond).toHaveBeenCalledWith('evt_1', 'usr_me', 'tentative')
  })

  it('does not answer on somebody else\u2019s behalf', () => {
    render(
      <EventAttendeesPanel
        eventId="evt_1"
        attendees={[attendee({ userId: 'usr_other' })]}
        currentUserId="usr_me"
        memberNames={MEMBERS}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Accept' })
    ).not.toBeInTheDocument()
  })
})
