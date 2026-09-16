// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makePhase, makeProject, makeTaskList } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  retrieveProject: vi.fn(),
  listTaskLists: vi.fn(),
  listPhases: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/task-lists',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      list: mocks.listProjects,
      retrieve: mocks.retrieveProject,
    },
    taskLists: {
      list: mocks.listTaskLists,
    },
    milestones: {
      list: mocks.listPhases,
    },
  },
}))

import { TaskListsData } from './task-lists-data'

afterEach(cleanup)

describe('TaskListsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listTaskLists.mockResolvedValue({
      data: listOf([makeTaskList()]),
      error: null,
    })
    mocks.listPhases.mockResolvedValue({
      data: listOf([makePhase()]),
      error: null,
    })
  })

  it('renders the project picker when no project is selected', async () => {
    render(
      await TaskListsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listTaskLists).not.toHaveBeenCalled()
    expect(screen.getByText('Select a project')).toBeInTheDocument()
    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
  })

  it('renders task-list rows with phase and progress for a project', async () => {
    render(
      await TaskListsData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(mocks.listTaskLists).toHaveBeenCalledWith('org_1', 'proj_test')
    expect(screen.getByText('Launch checklist')).toBeInTheDocument()
    expect(screen.getByText('Integration')).toBeInTheDocument()
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })

  it('keeps the shell and shows a banner when loading fails', async () => {
    mocks.listTaskLists.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await TaskListsData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(
      screen.getByText('Some task-list data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('No task lists yet.')).toBeInTheDocument()
  })
})
