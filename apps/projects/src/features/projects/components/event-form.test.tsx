import type { Milestone, Project, ProjectEvent } from '@876/projects/contracts'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  addAttendee: vi.fn(),
  removeAttendee: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/client/events', () => ({
  eventsClient: {
    create: mocks.create,
    update: mocks.update,
    delete: vi.fn(),
    addAttendee: mocks.addAttendee,
    removeAttendee: mocks.removeAttendee,
    respondAttendee: vi.fn(),
  },
}))

const { EventForm } = await import('./event-form')

const SEPTEMBER_20_2026 = Date.UTC(2026, 8, 20) / 1000

function project(): Project {
  return {
    object: 'projects.project',
    id: 'prj_1',
    tenantId: 'tnt_1',
    name: 'Apollo',
    key: 'APL',
    slug: 'apollo',
    description: null,
    leadUserId: null,
    status: 'active',
    health: 'on-track',
    startDate: null,
    targetDate: null,
    nextIssueNumber: 1,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 0,
    archivedAt: null,
    createdAt: 0,
    updatedAt: 0,
    memberCount: 2,
  }
}

function phase(): Milestone {
  return {
    object: 'projects.milestone',
    id: 'mst_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    key: 'M1',
    name: 'Phase One',
    description: null,
    status: 'open',
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 0,
    createdAt: 0,
    updatedAt: 0,
  }
}

const OPTIONS = {
  projects: [project()],
  phases: [phase()],
  workItems: [{ id: 'iss_1', identifier: 'APL-1', title: 'Ship the calendar' }],
  members: [
    { userId: 'usr_2', name: 'Ada Lovelace' },
    { userId: 'usr_3', name: 'Grace Hopper' },
  ],
}

function event(): ProjectEvent {
  return {
    object: 'projects.event',
    id: 'evt_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    milestoneId: null,
    issueId: null,
    kind: 'event',
    title: 'Design review',
    description: null,
    startsAt: SEPTEMBER_20_2026,
    endsAt: null,
    allDay: true,
    location: null,
    meetingUrl: null,
    createdBy: 'usr_1',
    recurrence: null,
    attendees: [
      {
        object: 'projects.event-attendee',
        id: 'att_1',
        eventId: 'evt_1',
        userId: 'usr_2',
        response: 'invited',
        createdAt: 0,
        updatedAt: 0,
      },
    ],
  }
}

function fillBasics() {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Design review' },
  })
  fireEvent.change(screen.getByLabelText('Project'), {
    target: { value: 'prj_1' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({
    data: { ...event(), id: 'evt_created' },
    error: null,
  })
  mocks.update.mockResolvedValue({ data: event(), error: null })
  mocks.addAttendee.mockResolvedValue({ data: {}, error: null })
  mocks.removeAttendee.mockResolvedValue({ data: {}, error: null })
})

describe('EventForm', () => {
  it('renders every field an event needs, including the recurrence section', () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    expect(screen.getByLabelText('Kind')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Phase')).toBeInTheDocument()
    expect(screen.getByLabelText('Work item')).toBeInTheDocument()
    expect(screen.getByLabelText('Starts')).toBeInTheDocument()
    expect(screen.getByLabelText('Ends')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Meeting URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Member')).toBeInTheDocument()
    expect(screen.getByLabelText('Repeat this event')).toBeInTheDocument()
  })

  it('creates with no recurrence when the section is left off', async () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    fillBasics()
    fireEvent.click(screen.getByLabelText('All day'))
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-09-20' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      projectId: 'prj_1',
      title: 'Design review',
      kind: 'event',
      allDay: true,
      startsAt: SEPTEMBER_20_2026,
      endsAt: null,
      recurrence: null,
    })
  })

  it('never sends a creator: the API takes it from the session', async () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    fillBasics()
    fireEvent.click(screen.getByLabelText('All day'))
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-09-20' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(Object.keys(mocks.create.mock.calls[0][0])).not.toContain(
      'createdBy'
    )
  })

  it('builds a weekly recurrence payload with weekdays and an occurrence count', async () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    fillBasics()
    fireEvent.click(screen.getByLabelText('All day'))
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-09-20' },
    })

    fireEvent.click(screen.getByLabelText('Repeat this event'))
    fireEvent.change(screen.getByLabelText('Frequency'), {
      target: { value: 'weekly' },
    })
    fireEvent.change(screen.getByLabelText('Repeat every'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByLabelText('Tue'))
    fireEvent.click(screen.getByLabelText('Thu'))
    fireEvent.change(screen.getByLabelText('Series ends'), {
      target: { value: 'after' },
    })
    fireEvent.change(screen.getByLabelText('Occurrences'), {
      target: { value: '5' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0].recurrence).toEqual({
      freq: 'weekly',
      interval: 2,
      byWeekday: [1, 3],
      count: 5,
    })
  })

  it('carries a daily recurrence that ends on a date', async () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    fillBasics()
    fireEvent.click(screen.getByLabelText('All day'))
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-09-20' },
    })

    fireEvent.click(screen.getByLabelText('Repeat this event'))
    fireEvent.change(screen.getByLabelText('Frequency'), {
      target: { value: 'daily' },
    })
    fireEvent.change(screen.getByLabelText('Series ends'), {
      target: { value: 'on' },
    })
    fireEvent.change(screen.getByLabelText('Ends on'), {
      target: { value: '2026-09-30' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0].recurrence).toEqual({
      freq: 'daily',
      interval: 1,
      until: Date.UTC(2026, 8, 30) / 1000,
    })
  })

  it('invites the attendees the user picked onto the created event', async () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    fillBasics()
    fireEvent.click(screen.getByLabelText('All day'))
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-09-20' },
    })
    fireEvent.change(screen.getByLabelText('Member'), {
      target: { value: 'usr_2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add attendee' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.addAttendee).toHaveBeenCalledTimes(1))
    expect(mocks.addAttendee).toHaveBeenCalledWith('evt_created', {
      userId: 'usr_2',
    })
    expect(mocks.push).toHaveBeenCalledWith('/calendar/events/evt_created')
  })

  it('refuses to submit without a title', () => {
    render(<EventForm mode="create" options={OPTIONS} />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('reconciles attendees when an event is edited', async () => {
    render(<EventForm mode="edit" event={event()} options={OPTIONS} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove attendee Ada Lovelace' })
    )
    fireEvent.change(screen.getByLabelText('Member'), {
      target: { value: 'usr_3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add attendee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('evt_1', expect.anything())
    expect(mocks.addAttendee).toHaveBeenCalledWith('evt_1', { userId: 'usr_3' })
    expect(mocks.removeAttendee).toHaveBeenCalledWith('evt_1', 'usr_2')
    expect(mocks.push).toHaveBeenCalledWith('/calendar/events/evt_1')
  })
})
