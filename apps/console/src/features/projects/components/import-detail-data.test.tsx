// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  retrieveJob: vi.fn(),
  listRows: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/imports/impj_1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    importJobs: {
      retrieve: mocks.retrieveJob,
      listRows: mocks.listRows,
    },
  },
}))

import { ImportDetailData } from './import-detail-data'

function makeJob(overrides = {}) {
  return {
    object: 'projects.import-job',
    id: 'impj_1',
    tenantId: 'prjten_1',
    source: 'csv',
    projectId: 'proj_1',
    status: 'preview',
    rowCount: 2,
    successCount: 1,
    failureCount: 1,
    contentHash: 'hash_1',
    unmappedFields: ['custom_1'],
    preview: [
      { rowIndex: 0, kind: 'issue', title: 'First', valid: true, errors: [] },
      {
        rowIndex: 1,
        kind: 'issue',
        title: '',
        valid: false,
        errors: ['Missing title'],
      },
    ],
    notes: [],
    createdAt: 1700000000,
    updatedAt: 1700000001,
    ...overrides,
  }
}

afterEach(cleanup)

describe('ImportDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveJob.mockResolvedValue({ data: makeJob(), error: null })
    mocks.listRows.mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/rows',
      },
      error: null,
    })
  })

  it('retrieves the decoded job and its rows', async () => {
    render(
      await ImportDetailData({ organizationId: 'org_1', jobId: 'impj%201' })
    )

    expect(mocks.retrieveJob).toHaveBeenCalledWith('org_1', 'impj 1')
    expect(mocks.listRows).toHaveBeenCalledWith('org_1', 'impj 1')
  })

  it('renders the job summary with preview rows', async () => {
    render(await ImportDetailData({ organizationId: 'org_1', jobId: 'impj_1' }))

    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Missing title')).toBeInTheDocument()
  })

  it('renders unmapped fields without dropping them', async () => {
    render(await ImportDetailData({ organizationId: 'org_1', jobId: 'impj_1' }))

    expect(screen.getByText('custom_1')).toBeInTheDocument()
  })

  it('sends missing jobs to notFound', async () => {
    mocks.retrieveJob.mockResolvedValue({
      data: null,
      error: { code: 'projects/import-job-not-found', message: 'Missing.' },
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })

    await expect(
      ImportDetailData({ organizationId: 'org_1', jobId: 'impj_missing' })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('surfaces a banner when rows cannot be loaded', async () => {
    mocks.listRows.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await ImportDetailData({ organizationId: 'org_1', jobId: 'impj_1' }))

    expect(
      screen.getByText('Some import rows could not be loaded')
    ).toBeInTheDocument()
  })
})
