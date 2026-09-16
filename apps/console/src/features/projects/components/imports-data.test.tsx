// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  listJobs: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/imports',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    importJobs: { list: mocks.listJobs },
  },
}))

import { ImportsData } from './imports-data'

function envelope(data: unknown[]) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url: '/v1/organizations/org_1/import-jobs',
  }
}

function makeJob(overrides = {}) {
  return {
    object: 'projects.import-job',
    id: 'impj_1',
    tenantId: 'prjten_1',
    source: 'csv',
    projectId: 'proj_1',
    status: 'preview',
    rowCount: 4,
    successCount: 3,
    failureCount: 1,
    contentHash: 'hash_1',
    unmappedFields: [],
    preview: [],
    notes: [],
    createdAt: 1700000000,
    updatedAt: 1700000001,
    ...overrides,
  }
}

afterEach(cleanup)

describe('ImportsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listJobs.mockResolvedValue({
      data: envelope([makeJob()]),
      error: null,
    })
  })

  it('fetches import jobs for the host organization', async () => {
    render(await ImportsData({ organizationId: 'org_1', base: '/projects' }))

    expect(mocks.listJobs).toHaveBeenCalledWith('org_1')
  })

  it('renders job source and status', async () => {
    render(await ImportsData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('Previewing')).toBeInTheDocument()
  })

  it('links each job to its detail under the host root', async () => {
    render(
      await ImportsData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(
      screen.getByRole('link', { name: 'View import impj_1' })
    ).toHaveAttribute('href', '/workspace/acme/projects/imports/impj_1')
  })

  it('surfaces a banner when jobs cannot be loaded', async () => {
    mocks.listJobs.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await ImportsData({ organizationId: 'org_1', base: '/projects' }))

    expect(
      screen.getByText('Import data could not be loaded')
    ).toBeInTheDocument()
  })

  it('shows the shared empty state when no jobs exist', async () => {
    mocks.listJobs.mockResolvedValue({ data: envelope([]), error: null })

    render(await ImportsData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getByText('No import jobs yet')).toBeInTheDocument()
  })
})
