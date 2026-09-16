// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeCycle, makeIssue, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveCycle: vi.fn(),
  retrieveProject: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/cycles/cyc_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    cycles: {
      retrieve: mocks.retrieveCycle,
    },
    projects: {
      retrieve: mocks.retrieveProject,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import { CycleDetailData } from './cycle-detail-data'

afterEach(cleanup)

describe('CycleDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveCycle.mockResolvedValue({
      data: makeCycle(),
      error: null,
    })
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: listOf([makeIssue({ cycleId: 'cyc_test' }), makeIssue({ id: 'issue_2', identifier: 'FAL-2', cycleId: null })]),
      error: null,
    })
  })

  it('renders cycle facts and only its assigned work items', async () => {
    render(
      await CycleDetailData({
        organizationId: 'org_1',
        base: '/projects',
        cycleId: 'cyc_test',
      })
    )

    expect(mocks.retrieveCycle).toHaveBeenCalledWith('org_1', 'cyc_test')
    expect(screen.getByText('Sprint 7')).toBeInTheDocument()
    expect(screen.getByText('Finish static fire')).toBeInTheDocument()
    expect(screen.getByText('Assigned work items (1)')).toBeInTheDocument()
  })

  it('renders AppError when the cycle cannot be loaded', async () => {
    mocks.retrieveCycle.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await CycleDetailData({
        organizationId: 'org_1',
        base: '/projects',
        cycleId: 'cyc_test',
      })
    )

    expect(screen.getByText('Cycle could not be loaded')).toBeInTheDocument()
  })

  it('calls notFound for an unknown cycle', async () => {
    mocks.retrieveCycle.mockResolvedValue({
      data: null,
      error: { code: 'projects/cycle-not-found', message: 'missing' },
    })

    await expect(
      CycleDetailData({
        organizationId: 'org_1',
        base: '/projects',
        cycleId: 'cyc_missing',
      })
    ).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalled()
  })
})
