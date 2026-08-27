import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { DirectoryMember } from '@/features/directory/types'
import type { CrmRequestTask } from '@/types/crm'

import { RequestTasksSection } from './request-tasks'

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
    requestTasks: {
      create: mocks.create,
      update: mocks.update,
      delete: mocks.remove,
    },
  },
}))

vi.mock('sonner', () => ({ toast: { error: mocks.error } }))

function createTask(overrides: Partial<CrmRequestTask> = {}): CrmRequestTask {
  return {
    object: 'request_task',
    id: 'crm_task_7',
    tenantId: 'crm_tenant_island',
    requestId: 'crm_req_1042',
    title: 'Call the customer back',
    description: null,
    status: 'OPEN',
    priority: 'NORMAL',
    assigneeId: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
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
  ]
}

function renderSection(tasks: CrmRequestTask[]) {
  return render(
    <RequestTasksSection
      requestId="crm_req_1042"
      tasks={tasks}
      members={createMembers()}
    />
  )
}

describe('RequestTasksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: createTask(), error: null })
    mocks.update.mockResolvedValue({ data: createTask(), error: null })
    mocks.remove.mockResolvedValue({
      data: { object: 'request_task', id: 'crm_task_7', deleted: true },
      error: null,
    })
  })

  describe('rendering', () => {
    it('says the checklist is empty rather than showing a bare list', () => {
      renderSection([])

      expect(
        screen.getByText('No tasks on this request yet.')
      ).toBeInTheDocument()
      expect(screen.queryByText('done')).not.toBeInTheDocument()
    })

    it('counts how many tasks are done', () => {
      renderSection([
        createTask({ id: 'a', title: 'One', status: 'DONE' }),
        createTask({ id: 'b', title: 'Two', sortOrder: 1 }),
      ])

      expect(screen.getByText('1 of 2 done')).toBeInTheDocument()
    })

    it('sinks settled tasks below outstanding ones regardless of sortOrder', () => {
      renderSection([
        createTask({
          id: 'a',
          title: 'Finished',
          status: 'DONE',
          sortOrder: 0,
        }),
        createTask({
          id: 'b',
          title: 'Cancelled too',
          status: 'CANCELLED',
          sortOrder: 1,
        }),
        createTask({ id: 'c', title: 'Still open', sortOrder: 2 }),
      ])

      const titles = screen
        .getAllByRole('listitem')
        .map((item) => within(item).getAllByRole('button')[0].textContent)

      expect(titles).toEqual(['Still open', 'Finished', 'Cancelled too'])
    })

    it('shows the assignee resolved from the directory, not the raw id', () => {
      renderSection([createTask({ assigneeId: 'user_althea_123' })])

      expect(screen.getByText('Althea Morgan')).toBeInTheDocument()
      expect(screen.queryByText('user_althea_123')).not.toBeInTheDocument()
    })
  })

  describe('adding a task', () => {
    it('sends the trimmed title and refreshes the server list', async () => {
      const user = userEvent.setup()
      renderSection([])

      await user.type(screen.getByLabelText('New task'), '  Chase courier  ')
      await user.click(screen.getByRole('button', { name: 'Add task' }))

      await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
      expect(mocks.create).toHaveBeenCalledWith('crm_req_1042', {
        title: 'Chase courier',
        description: null,
        priority: 'NORMAL',
        assigneeId: null,
        dueAt: null,
      })
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    })

    it('keeps the submit button disabled while the title is empty', () => {
      renderSection([])

      expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('reports a failure and does not refresh the list', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: { code: 'crm/invalid-body', message: 'A task needs a title.' },
      })
      const user = userEvent.setup()
      renderSection([])

      await user.type(screen.getByLabelText('New task'), 'Chase courier')
      await user.click(screen.getByRole('button', { name: 'Add task' }))

      await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith('A task needs a title.')
      )
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })

  describe('completing a task', () => {
    it('marks an open task DONE from the checkbox', async () => {
      const user = userEvent.setup()
      renderSection([createTask()])

      await user.click(
        screen.getByRole('checkbox', {
          name: 'Complete Call the customer back',
        })
      )

      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
      expect(mocks.update).toHaveBeenCalledWith('crm_req_1042', 'crm_task_7', {
        status: 'DONE',
      })
    })

    it('reopens a done task from the same checkbox', async () => {
      const user = userEvent.setup()
      renderSection([createTask({ status: 'DONE' })])

      await user.click(
        screen.getByRole('checkbox', { name: 'Reopen Call the customer back' })
      )

      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
      expect(mocks.update).toHaveBeenCalledWith('crm_req_1042', 'crm_task_7', {
        status: 'OPEN',
      })
    })

    it('hides the status select on a done task, so it cannot fight the checkbox', () => {
      renderSection([createTask({ status: 'DONE' })])

      expect(
        screen.queryByLabelText('Status of Call the customer back')
      ).not.toBeInTheDocument()
    })

    it('never offers DONE in the status select', () => {
      renderSection([createTask()])

      const select = screen.getByLabelText('Status of Call the customer back')
      expect(
        within(select).queryByRole('option', { name: 'Done' })
      ).not.toBeInTheDocument()
      expect(
        within(select).getByRole('option', { name: 'In progress' })
      ).toBeInTheDocument()
    })
  })

  describe('editing a task', () => {
    it('rejects a title edited down to whitespace', async () => {
      const user = userEvent.setup()
      renderSection([createTask()])

      await user.click(
        screen.getByRole('button', { name: 'Edit Call the customer back' })
      )
      await user.clear(screen.getByLabelText('Task title'))
      await user.type(screen.getByLabelText('Task title'), '   ')

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('leaves edit mode on cancel without calling the service', async () => {
      const user = userEvent.setup()
      renderSection([createTask()])

      await user.click(
        screen.getByRole('button', { name: 'Edit Call the customer back' })
      )
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument()
      expect(mocks.update).not.toHaveBeenCalled()
    })
  })

  describe('deleting a task', () => {
    it('deletes it and refreshes the server list', async () => {
      const user = userEvent.setup()
      renderSection([createTask()])

      await user.click(
        screen.getByRole('button', { name: 'Delete Call the customer back' })
      )

      await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
      expect(mocks.remove).toHaveBeenCalledWith('crm_req_1042', 'crm_task_7')
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    })

    it('reports a failure and does not refresh the list', async () => {
      mocks.remove.mockResolvedValue({
        data: null,
        error: {
          code: 'crm/task-not-found',
          message: 'Request task not found.',
        },
      })
      const user = userEvent.setup()
      renderSection([createTask()])

      await user.click(
        screen.getByRole('button', { name: 'Delete Call the customer back' })
      )

      await waitFor(() =>
        expect(mocks.error).toHaveBeenCalledWith('Request task not found.')
      )
      expect(mocks.refresh).not.toHaveBeenCalled()
    })
  })
})
