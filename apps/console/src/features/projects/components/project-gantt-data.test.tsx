// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeBaseline,
  makeBaselineComparison,
  makeGantt,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveGantt: vi.fn(),
  listBaselines: vi.fn(),
  retrieveComparison: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/gantt',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    gantt: {
      retrieve: mocks.retrieveGantt,
    },
    baselines: {
      list: mocks.listBaselines,
      comparison: mocks.retrieveComparison,
    },
  },
}))

import { ProjectGanttData } from './project-gantt-data'

afterEach(cleanup)

describe('ProjectGanttData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveGantt.mockResolvedValue({
      data: makeGantt(),
      error: null,
    })
    mocks.listBaselines.mockResolvedValue({
      data: listOf([makeBaseline()]),
      error: null,
    })
    mocks.retrieveComparison.mockResolvedValue({
      data: makeBaselineComparison(),
      error: null,
    })
  })

  it('renders the timeline with the baseline selector', async () => {
    render(
      await ProjectGanttData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(mocks.retrieveGantt).toHaveBeenCalledWith('org_1', 'proj_test', {
      includeSubItems: true,
    })
    expect(screen.getByText('Merlin engine checkout')).toBeInTheDocument()
    expect(screen.getByText('Pre-flight baseline')).toBeInTheDocument()
    expect(screen.getByText('FAL-1')).toBeInTheDocument()
  })

  it('renders AppError when the timeline cannot be loaded', async () => {
    mocks.retrieveGantt.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectGanttData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(screen.getByText('Gantt could not be loaded')).toBeInTheDocument()
  })

  it('calls notFound for an unknown project', async () => {
    mocks.retrieveGantt.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-not-found', message: 'missing' },
    })

    await expect(
      ProjectGanttData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_missing',
      })
    ).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalled()
  })
})
