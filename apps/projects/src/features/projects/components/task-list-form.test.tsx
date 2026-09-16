/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { Milestone, Project, TaskList } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  taskListsClient: {
    create: mocks.create,
    update: mocks.update,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { TaskListForm } from './task-list-form'

const project: Project = {
  object: 'projects.project',
  id: 'prj_1',
  tenantId: 'tenant_1',
  name: 'Console',
  key: 'CONSOLE',
  slug: 'console',
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
  createdAt: 1,
  updatedAt: 1,
  memberCount: 2,
  customFields: [],
}

const otherProject: Project = {
  ...project,
  id: 'prj_2',
  name: 'Widgets',
  key: 'WIDGETS',
  slug: 'widgets',
}

function makeMilestone(overrides: Partial<Milestone>): Milestone {
  return {
    object: 'projects.milestone',
    id: 'ms_1',
    tenantId: 'tenant_1',
    projectId: project.id,
    key: 'M1',
    name: 'Release one',
    description: null,
    status: 'open',
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

const taskList: TaskList = {
  object: 'task-list',
  id: 'tl_1',
  tenantId: 'tenant_1',
  projectId: project.id,
  milestoneId: 'ms_1',
  name: 'Backend groundwork',
  description: 'Schema and endpoints.',
  ownerUserId: 'usr_ana',
  startDate: 1699920000,
  targetDate: 1702598400,
  position: 0,
  archivedAt: null,
  progress: { total: 4, completed: 1 },
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ data: taskList, error: null })
  mocks.update.mockResolvedValue({ data: taskList, error: null })
})

describe('TaskListForm', () => {
  it('renders the task list fields', () => {
    render(
      <TaskListForm
        mode="create"
        projects={[project]}
        milestones={[makeMilestone({})]}
        members={[{ userId: 'usr_ana', label: 'Ana Brown' }]}
      />
    )

    expect(screen.getByLabelText('Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Phase')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Owner')).toBeInTheDocument()
    expect(screen.getByLabelText('Start date')).toBeInTheDocument()
    expect(screen.getByLabelText('Target date')).toBeInTheDocument()
  })

  it('uses a bare verb label for the create action', () => {
    render(
      <TaskListForm
        mode="create"
        projects={[project]}
        milestones={[]}
        members={[]}
      />
    )

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('offers only the phases of the selected project', () => {
    render(
      <TaskListForm
        mode="create"
        projects={[project, otherProject]}
        milestones={[
          makeMilestone({ id: 'ms_1', name: 'Release one' }),
          makeMilestone({
            id: 'ms_2',
            projectId: otherProject.id,
            name: 'Widget parity',
          }),
        ]}
        members={[]}
      />
    )

    const phaseSelect = screen.getByLabelText('Phase')
    expect(
      within(phaseSelect).getByRole('option', { name: 'Release one' })
    ).toBeInTheDocument()
    expect(
      within(phaseSelect).queryByRole('option', { name: 'Widget parity' })
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Project'), {
      target: { value: otherProject.id },
    })

    expect(
      within(phaseSelect).getByRole('option', { name: 'Widget parity' })
    ).toBeInTheDocument()
    expect(
      within(phaseSelect).queryByRole('option', { name: 'Release one' })
    ).not.toBeInTheDocument()
  })

  it('creates the task list for the selected project and returns to it', async () => {
    render(
      <TaskListForm
        mode="create"
        projects={[project]}
        milestones={[makeMilestone({})]}
        members={[{ userId: 'usr_ana', label: 'Ana Brown' }]}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Backend groundwork  ' },
    })
    fireEvent.change(screen.getByLabelText('Phase'), {
      target: { value: 'ms_1' },
    })
    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'usr_ana' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        projectId: project.id,
        name: 'Backend groundwork',
        description: null,
        milestoneId: 'ms_1',
        ownerUserId: 'usr_ana',
        startDate: null,
        targetDate: null,
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/projects/prj_1')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('sends an update without the project for an existing task list', async () => {
    render(
      <TaskListForm
        mode="edit"
        taskList={taskList}
        projects={[project]}
        milestones={[makeMilestone({})]}
        members={[{ userId: 'usr_ana', label: 'Ana Brown' }]}
      />
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Backend groundwork')
    expect(screen.getByLabelText('Owner')).toHaveValue('usr_ana')
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Backend' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith('tl_1', {
        name: 'Backend',
        description: 'Schema and endpoints.',
        milestoneId: 'ms_1',
        ownerUserId: 'usr_ana',
        startDate: 1699920000,
        targetDate: 1702598400,
      })
    )
  })

  it('shows the failure instead of navigating when the save fails', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'Missing project.',
      },
    })

    render(
      <TaskListForm
        mode="create"
        projects={[project]}
        milestones={[]}
        members={[]}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Backend groundwork' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Task list not saved')).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
