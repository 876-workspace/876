import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { DirectoryMember } from '@/features/directory/types'
import type { CrmRequestReminder } from '@/types/crm'

import { RequestRemindersSection } from './request-reminders'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  error: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestReminders: {
      create: mocks.create,
      update: mocks.update,
      delete: mocks.remove,
    },
  },
}))

vi.mock('sonner', () => ({ toast: { error: mocks.error } }))

function createReminder(
  overrides: Partial<CrmRequestReminder> = {}
): CrmRequestReminder {
  return {
    object: 'request_reminder',
    id: 'crm_rem_3',
    tenantId: 'crm_tenant_island',
    requestId: 'crm_req_1042',
    title: 'Chase the courier',
    note: null,
    remindAt: 1_788_600_000,
    userId: 'user_althea_123',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_althea_123',
    createdAt: 1_788_000_000,
    updatedAt: 1_788_000_000,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

function createMembers(): DirectoryMember[] {
  return [
    {
      userId: 'user_althea_123',
      name: 'Althea Morgan',
      email: 'althea@island.test',
      avatar: null,
    },
    {
      userId: 'user_dario_456',
      name: 'Dario Bennett',
      email: 'dario@island.test',
      avatar: null,
    },
  ]
}

function renderSection(
  reminders: CrmRequestReminder[],
  currentUserId = 'user_althea_123'
) {
  return render(
    <RequestRemindersSection
      requestId="crm_req_1042"
      reminders={reminders}
      currentUserId={currentUserId}
      members={createMembers()}
    />
  )
}

describe('RequestRemindersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: createReminder(), error: null })
    mocks.update.mockResolvedValue({ data: createReminder(), error: null })
    mocks.remove.mockResolvedValue({
      data: { object: 'request_reminder', id: 'crm_rem_3', deleted: true },
      error: null,
    })
  })

  describe('rendering', () => {
    it('says the list is empty rather than showing a bare list', () => {
      renderSection([])

      expect(
        screen.getByText('No reminders on this request yet.')
      ).toBeInTheDocument()
    })

    it('counts only the reminders still scheduled', () => {
      renderSection([
        createReminder({ id: 'a', title: 'One' }),
        createReminder({ id: 'b', title: 'Two', status: 'DISMISSED' }),
      ])

      expect(screen.getByText('1 scheduled')).toBeInTheDocument()
    })

    it('sinks fired and cancelled reminders below the scheduled ones', () => {
      renderSection([
        createReminder({
          id: 'a',
          title: 'Already sent',
          status: 'SENT',
          remindAt: 1_788_000_000,
        }),
        createReminder({
          id: 'b',
          title: 'Still scheduled',
          remindAt: 1_789_000_000,
        }),
      ])

      const titles = screen
        .getAllByRole('listitem')
        .map((item) => within(item).getAllByRole('button')[0].textContent)

      expect(titles).toEqual(['Still scheduled', 'Already sent'])
    })

    it('names the viewer as "You" and a colleague by name', () => {
      renderSection([
        createReminder({ id: 'a', userId: 'user_althea_123' }),
        createReminder({ id: 'b', title: 'Theirs', userId: 'user_dario_456' }),
      ])

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.getByText('Dario Bennett')).toBeInTheDocument()
    })
  })

  describe('adding a reminder', () => {
    it('sends the trimmed title and the chosen moment as Unix seconds', async () => {
      const user = userEvent.setup()
      renderSection([])

      await user.type(screen.getByLabelText('New reminder'), '  Chase  ')
      await user.type(screen.getByLabelText('Remind at'), '2026-09-01T09:30')
      await user.click(screen.getByRole('button', { name: 'Add reminder' }))

      await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
      expect(mocks.create).toHaveBeenCalledWith('crm_req_1042', {
        title: 'Chase',
        note: null,
        remindAt: Math.floor(new Date('2026-09-01T09:30').getTime() / 1000),
      })
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    })

    it('omits userId so the route handler defaults the owner to the session', async () => {
      const user = userEvent.setup()
      renderSection([])

      await user.type(screen.getByLabelText('New reminder'), 'Chase')
      await user.type(screen.getByLabelText('Remind at'), '2026-09-01T09:30')
      await user.click(screen.getByRole('button', { name: 'Add reminder' }))

      await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
      expect(mocks.create.mock.calls[0][1]).not.toHaveProperty('userId')
    })

    it('keeps submit disabled until both a title and a moment are given', async () => {
      const user = userEvent.setup()
      renderSection([])

      expect(
        screen.getByRole('button', { name: 'Add reminder' })
      ).toBeDisabled()

      await user.type(screen.getByLabelText('New reminder'), 'Chase')
      expect(
        screen.getByRole('button', { name: 'Add reminder' })
      ).toBeDisabled()

      await user.type(screen.getByLabelText('Remind at'), '2026-09-01T09:30')
      expect(screen.getByRole('button', { name: 'Add reminder' })).toBeEnabled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('reports a failure and does not refresh the list', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: { code: 'crm/request-not-found', message: 'Request not found.' },
      })
      const user = userEvent.setup()
      renderSection([])

      await user.type(screen.getByLabelText('New reminder'), 'Chase')
      await user.type(screen.getByLabelText('Remind at'), '2026-09-01T09:30')
      await user.click(screen.getByRole('button', { name: 'Add reminder' }))

      await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith('Request not found.')
      )
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })

  describe('changing a reminder’s state', () => {
    it('dismisses a scheduled reminder', async () => {
      const user = userEvent.setup()
      renderSection([createReminder()])

      await user.click(
        screen.getByRole('button', { name: 'Dismiss Chase the courier' })
      )

      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
      expect(mocks.update).toHaveBeenCalledWith('crm_req_1042', 'crm_rem_3', {
        status: 'DISMISSED',
      })
    })

    it('cancels a scheduled reminder', async () => {
      const user = userEvent.setup()
      renderSection([createReminder()])

      await user.click(
        screen.getByRole('button', { name: 'Cancel Chase the courier' })
      )

      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
      expect(mocks.update).toHaveBeenCalledWith('crm_req_1042', 'crm_rem_3', {
        status: 'CANCELLED',
      })
    })

    it('offers reschedule — not dismiss — once a reminder has fired', async () => {
      const user = userEvent.setup()
      renderSection([createReminder({ status: 'SENT' })])

      expect(
        screen.queryByRole('button', { name: 'Dismiss Chase the courier' })
      ).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Reschedule Chase the courier' })
      )

      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
      expect(mocks.update).toHaveBeenCalledWith('crm_req_1042', 'crm_rem_3', {
        status: 'SCHEDULED',
      })
    })
  })

  describe('deleting a reminder', () => {
    it('deletes it and refreshes the server list', async () => {
      const user = userEvent.setup()
      renderSection([createReminder()])

      await user.click(
        screen.getByRole('button', { name: 'Delete Chase the courier' })
      )

      await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
      expect(mocks.remove).toHaveBeenCalledWith('crm_req_1042', 'crm_rem_3')
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    })

    it('reports a failure and does not refresh the list', async () => {
      mocks.remove.mockResolvedValue({
        data: null,
        error: {
          code: 'crm/reminder-not-found',
          message: 'Request reminder not found.',
        },
      })
      const user = userEvent.setup()
      renderSection([createReminder()])

      await user.click(
        screen.getByRole('button', { name: 'Delete Chase the courier' })
      )

      await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith('Request reminder not found.')
      )
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })
})
