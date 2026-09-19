// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makePhase,
  makePhaseEvent,
  makePhaseField,
  makePhaseFieldValue,
  makePhaseSummary,
  makeProject,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrievePhase: vi.fn(),
  retrieveProject: vi.fn(),
  retrieveSummary: vi.fn(),
  listComments: vi.fn(),
  listEvents: vi.fn(),
  listFields: vi.fn(),
  listValues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/phases/ms_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    milestones: {
      retrieve: mocks.retrievePhase,
      summary: { retrieve: mocks.retrieveSummary },
      comments: { list: mocks.listComments },
      events: { list: mocks.listEvents },
      customFields: {
        list: mocks.listFields,
        values: { list: mocks.listValues },
      },
    },
    projects: {
      retrieve: mocks.retrieveProject,
    },
  },
}))

import { PhaseDetailData } from './phase-detail-data'

const emptyList = { data: listOf([]), error: null }

afterEach(cleanup)

describe('PhaseDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrievePhase.mockResolvedValue({
      data: makePhase(),
      error: null,
    })
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.retrieveSummary.mockResolvedValue({
      data: makePhaseSummary(),
      error: null,
    })
    mocks.listComments.mockResolvedValue(emptyList)
    mocks.listEvents.mockResolvedValue({
      data: listOf([makePhaseEvent()]),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([makePhaseField()]),
      error: null,
    })
    mocks.listValues.mockResolvedValue({
      data: listOf([makePhaseFieldValue()]),
      error: null,
    })
  })

  it('renders the phase with project, progress, and custom fields', async () => {
    render(
      await PhaseDetailData({ organizationId: 'org_1', phaseId: 'ms_test' })
    )

    expect(mocks.retrievePhase).toHaveBeenCalledWith('org_1', 'ms_test')
    expect(screen.getByText('Integration')).toBeInTheDocument()
    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.getByText('LC-39A')).toBeInTheDocument()
  })

  it('renders AppError when the phase cannot be loaded', async () => {
    mocks.retrievePhase.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await PhaseDetailData({ organizationId: 'org_1', phaseId: 'ms_test' })
    )

    expect(screen.getByText('Phase could not be loaded')).toBeInTheDocument()
  })

  it('calls notFound for an unknown phase', async () => {
    mocks.retrievePhase.mockResolvedValue({
      data: null,
      error: { code: 'projects/milestone-not-found', message: 'missing' },
    })

    await expect(
      PhaseDetailData({ organizationId: 'org_1', phaseId: 'ms_missing' })
    ).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('keeps the detail and banners enrichment failures', async () => {
    mocks.listEvents.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await PhaseDetailData({ organizationId: 'org_1', phaseId: 'ms_test' })
    )

    expect(
      screen.getByText('Some phase details could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Integration')).toBeInTheDocument()
  })
})
