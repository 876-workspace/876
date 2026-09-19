// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeCycle, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listCycles: vi.fn(),
  listProjects: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/cycles',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    cycles: {
      list: mocks.listCycles,
    },
    projects: {
      list: mocks.listProjects,
    },
  },
}))

import { CyclesData } from './cycles-data'

afterEach(cleanup)

describe('CyclesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listCycles.mockResolvedValue({
      data: listOf([makeCycle()]),
      error: null,
    })
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
  })

  it('renders cycle rows with project, status, and progress', async () => {
    render(
      await CyclesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listCycles).toHaveBeenCalledWith('org_1', {})
    expect(screen.getByText('Sprint 7')).toBeInTheDocument()
    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('1/4')).toBeInTheDocument()
  })

  it('passes project and status filters through to the API', async () => {
    render(
      await CyclesData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        status: 'active',
      })
    )

    expect(mocks.listCycles).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_test',
      status: 'active',
    })
  })

  it('keeps the table shell and shows a banner when loading fails', async () => {
    mocks.listCycles.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await CyclesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Some cycle data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('No cycles yet.')).toBeInTheDocument()
  })
})
