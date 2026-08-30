import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { CrmRequestEvent } from '@/types/crm'

import { RequestEventsSection } from './request-events'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestEvents: {
      create: mocks.create,
      delete: mocks.remove,
    },
  },
}))

function createEvent(
  overrides: Partial<CrmRequestEvent> = {}
): CrmRequestEvent {
  return {
    object: 'request_event',
    id: 'crm_evt_8',
    uid: 'evt_9f2c41d0@work.876',
    tenantId: 'crm_tenant_island',
    requestId: 'crm_req_1042',
    calendarId: 'cal_requests_island',
    title: 'Site visit with Alejandra',
    description: null,
    location: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    allDay: false,
    startAt: 1_788_008_400,
    endAt: 1_788_012_000,
    timeZone: 'America/Jamaica',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_2kL9mN4q',
    createdAt: 1_787_900_000,
    updatedAt: 1_787_900_000,
    ...overrides,
  }
}

describe('RequestEventsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: createEvent(), error: null })
    mocks.remove.mockResolvedValue({ data: { deleted: true }, error: null })
  })

  describe('rendering', () => {
    it('renders an empty state and a zero count with no events', () => {
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      expect(
        screen.getByText('No events scheduled for this request.')
      ).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('renders each event with its title and the event count', () => {
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[
            createEvent(),
            createEvent({ id: 'crm_evt_9', title: 'Follow-up call' }),
          ]}
        />
      )

      expect(screen.getByText('Site visit with Alejandra')).toBeInTheDocument()
      expect(screen.getByText('Follow-up call')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(
        screen.queryByText('No events scheduled for this request.')
      ).not.toBeInTheDocument()
    })

    it('orders events by start time regardless of input order', () => {
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[
            createEvent({
              id: 'crm_evt_late',
              title: 'Later',
              startAt: 1_788_100_000,
            }),
            createEvent({
              id: 'crm_evt_early',
              title: 'Earlier',
              startAt: 1_788_000_000,
            }),
          ]}
        />
      )

      const titles = screen
        .getAllByRole('listitem')
        .map((item) => within(item).getByText(/Earlier|Later/).textContent)
      expect(titles).toEqual(['Earlier', 'Later'])
    })

    it('appends the location to an event that has one', () => {
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[createEvent({ location: 'Kingston depot' })]}
        />
      )

      expect(screen.getByText(/Kingston depot/)).toBeInTheDocument()
    })

    it('labels an all-day event by its start date rather than a time', () => {
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[
            createEvent({
              allDay: true,
              startAt: null,
              endAt: null,
              timeZone: null,
              startDate: '2026-09-14',
              endDate: '2026-09-15',
            }),
          ]}
        />
      )

      expect(screen.getByText(/Sep 14, 2026/)).toBeInTheDocument()
    })
  })

  describe('creating a timed event', () => {
    it('sends the title, the unix bounds, and the local time zone', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Site visit'
      )
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
      const [requestId, body] = mocks.create.mock.calls[0]!
      expect(requestId).toBe('crm_req_1042')
      expect(body.title).toBe('Site visit')
      expect(body.allDay).toBe(false)
      expect(body.startAt).toBe(
        Math.floor(new Date('2026-09-14T09:00').getTime() / 1000)
      )
      expect(body.endAt).toBe(
        Math.floor(new Date('2026-09-14T10:00').getTime() / 1000)
      )
      expect(typeof body.timeZone).toBe('string')
      expect(body.timeZone.length).toBeGreaterThan(0)
    })

    it('refreshes the record and clears the composer after a successful create', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      const title = screen.getByPlaceholderText('Schedule an event…')
      await user.type(title, 'Site visit')
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
      expect(screen.getByPlaceholderText('Schedule an event…')).toHaveValue('')
    })
  })

  describe('creating an all-day event', () => {
    it('sends the date-only bounds and the calendar time zone', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Depot audit'
      )
      await user.click(screen.getByRole('checkbox', { name: /all day/i }))
      await user.type(screen.getByLabelText('Start date'), '2026-09-14')
      await user.type(screen.getByLabelText('End date'), '2026-09-15')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
      const [, body] = mocks.create.mock.calls[0]!
      expect(body.allDay).toBe(true)
      expect(body.startDate).toBe('2026-09-14')
      expect(body.endDate).toBe('2026-09-15')
      expect(body.startAt).toBeUndefined()
      expect(body.endAt).toBeUndefined()
      expect(typeof body.calendarTimeZone).toBe('string')
    })
  })

  describe('negative space', () => {
    it('does not call the client when the title is empty', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.click(screen.getByPlaceholderText('Schedule an event…'))
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('does not call the client when the title is only whitespace', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(screen.getByPlaceholderText('Schedule an event…'), '   ')
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('reports a validation error and skips the client when no times are chosen', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Site visit'
      )
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(
        await screen.findByText('Choose a valid start and end.')
      ).toBeInTheDocument()
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it('reports a validation error when an all-day event has no dates', async () => {
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Depot audit'
      )
      await user.click(screen.getByRole('checkbox', { name: /all day/i }))
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(
        await screen.findByText('Choose a valid start and end.')
      ).toBeInTheDocument()
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('renders the returned error and does not refresh when create fails', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: {
          code: 'crm/request-not-found',
          message: 'That request no longer exists.',
        },
      })
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Site visit'
      )
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(
        await screen.findByText('That request no longer exists.')
      ).toBeInTheDocument()
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it('keeps the composer open with its draft after a failed create', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: { code: 'crm/invalid-body', message: 'Rejected.' },
      })
      const user = userEvent.setup()
      render(<RequestEventsSection requestId="crm_req_1042" events={[]} />)

      await user.type(
        screen.getByPlaceholderText('Schedule an event…'),
        'Site visit'
      )
      await user.type(screen.getByLabelText('Start time'), '2026-09-14T09:00')
      await user.type(screen.getByLabelText('End time'), '2026-09-14T10:00')
      await user.click(screen.getByRole('button', { name: /schedule/i }))

      expect(await screen.findByText('Rejected.')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Schedule an event…')).toHaveValue(
        'Site visit'
      )
    })
  })

  describe('deleting an event', () => {
    it('deletes the chosen event and refreshes the record', async () => {
      const user = userEvent.setup()
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[createEvent()]}
        />
      )

      await user.click(
        screen.getByRole('button', { name: 'Delete Site visit with Alejandra' })
      )

      await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
      expect(mocks.remove).toHaveBeenCalledWith('crm_req_1042', 'crm_evt_8')
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    })

    it('renders the error and does not refresh when delete fails', async () => {
      mocks.remove.mockResolvedValue({
        data: null,
        error: {
          code: 'crm/request-event-not-found',
          message: 'That event was already removed.',
        },
      })
      const user = userEvent.setup()
      render(
        <RequestEventsSection
          requestId="crm_req_1042"
          events={[createEvent()]}
        />
      )

      await user.click(
        screen.getByRole('button', { name: 'Delete Site visit with Alejandra' })
      )

      expect(
        await screen.findByText('That event was already removed.')
      ).toBeInTheDocument()
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })
})
