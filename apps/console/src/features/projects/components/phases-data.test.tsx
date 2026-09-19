// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makePhase, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listAll: vi.fn(),
  listProjects: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/phases',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    milestones: {
      listAll: mocks.listAll,
    },
    projects: {
      list: mocks.listProjects,
    },
  },
}))

import { PhasesData } from './phases-data'

afterEach(cleanup)

describe('PhasesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listAll.mockResolvedValue({
      data: listOf([makePhase()]),
      error: null,
    })
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
  })

  it('renders phase rows with their project names', async () => {
    render(
      await PhasesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listAll).toHaveBeenCalledWith('org_1', undefined)
    expect(screen.getByText('Integration')).toBeInTheDocument()
    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('passes the status filter through to the API', async () => {
    render(
      await PhasesData({
        organizationId: 'org_1',
        base: '/projects',
        status: 'completed',
      })
    )

    expect(mocks.listAll).toHaveBeenCalledWith('org_1', {
      status: 'completed',
    })
  })

  it('keeps the table shell and shows a banner when loading fails', async () => {
    mocks.listAll.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await PhasesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Some phase data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('No phases yet.')).toBeInTheDocument()
  })
})
