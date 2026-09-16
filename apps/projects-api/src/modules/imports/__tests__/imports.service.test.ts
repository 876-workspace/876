import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository, issues, time } = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  repository: {
    listJobs: vi.fn(),
    retrieveJob: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    createJobRows: vi.fn(),
    listJobRows: vi.fn(),
    updateJobRow: vi.fn(),
  },
  issues: { create: vi.fn(), resolveIssue: vi.fn() },
  time: { createTimeEntry: vi.fn() },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../imports.repository.js', () => repository)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../../time/index.js', () => time)

const service = await import('../imports.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }

function jobRow(overrides = {}) {
  return {
    id: 'impj_1',
    tenantId: tenant.id,
    source: 'csv',
    projectId: 'prj_1',
    status: 'preview',
    rowCount: 1,
    successCount: 0,
    failureCount: 0,
    contentHash: 'hash',
    bundle: { rows: [] },
    preview: { rows: [], notes: [] },
    unmappedFields: [],
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

function persistedRow(overrides = {}) {
  return {
    id: 'impr_1',
    tenantId: tenant.id,
    jobId: 'impj_1',
    rowIndex: 0,
    kind: 'work-item',
    status: 'pending',
    externalRef: null,
    createdId: null,
    error: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
})

describe('createJob', () => {
  it('returns tenant-not-found for unknown organizations', async () => {
    tenants.resolveTenant.mockResolvedValueOnce(null)
    const result = await service.createJob('org_missing', {
      source: 'csv',
      content: 'title\nShip\n',
    })
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('rejects payloads over five megabytes', async () => {
    const result = await service.createJob('org_1', {
      source: 'csv',
      content: `title\n${'a'.repeat(6 * 1024 * 1024)}\n`,
    })
    expect(result.error?.code).toBe('projects/import-too-large')
    expect(repository.createJob).not.toHaveBeenCalled()
  })

  it('rejects unparseable payloads', async () => {
    const result = await service.createJob('org_1', {
      source: 'csv',
      content: 'title\n"unclosed\n',
    })
    expect(result.error?.code).toBe('projects/import-parse-failed')
  })

  it('builds a preview with per-row errors and unmapped fields', async () => {
    repository.createJob.mockImplementationOnce(async (data: {
      preview: unknown
      unmappedFields: unknown
    }) => jobRow({ preview: data.preview, unmappedFields: data.unmappedFields }))
    const result = await service.createJob('org_1', {
      source: 'csv',
      content: 'title,Sprint\nShip,S12\n,No title\n',
    })
    expect(result.error).toBeNull()
    const job = result.data as {
      rowCount: number
      unmappedFields: string[]
      preview: Array<{ valid: boolean; errors: string[] }>
      notes: string[]
    }
    expect(job.rowCount).toBe(1)
    expect(job.unmappedFields).toEqual(['Sprint'])
    expect(job.preview).toHaveLength(1)
    const statuses = repository.createJobRows.mock.calls[0]?.[0] as Array<{
      status: string
    }>
    expect(statuses.map((row) => row.status)).toEqual(['pending'])
  })

  it('marks invalid rows so commit skips them', async () => {
    repository.createJob.mockImplementationOnce(async (data: {
      preview: unknown
    }) => jobRow({ preview: data.preview }))
    const result = await service.createJob('org_1', {
      source: 'csv',
      content: 'title,status\nShip,!!! nope !!!\n',
    })
    expect(result.error).toBeNull()
    const statuses = repository.createJobRows.mock.calls[0]?.[0] as Array<{
      status: string
    }>
    expect(statuses.map((row) => row.status)).toEqual(['invalid'])
  })

  it('routes each source to its mapper', async () => {
    repository.createJob.mockImplementationOnce(async (data: {
      bundle: { rows: unknown[] }
    }) => jobRow({ bundle: data.bundle }))
    const result = await service.createJob('org_1', {
      source: 'trello-json',
      content: JSON.stringify({
        lists: [],
        cards: [{ id: 'c1', name: 'Ship', desc: '', closed: false, idList: 'l1', labels: [] }],
      }),
    })
    expect(result.error).toBeNull()
    expect(
      (repository.createJob.mock.calls[0]?.[0] as { source: string }).source
    ).toBe('trello-json')
  })
})

describe('commitJob', () => {
  const bundle = {
    rows: [
      {
        kind: 'work-item',
        workItem: { title: 'Ship it', labels: ['launch'] },
      },
    ],
  }

  it('rejects unknown jobs', async () => {
    repository.retrieveJob.mockResolvedValueOnce(null)
    const result = await service.commitJob('org_1', 'impj_missing')
    expect(result.error?.code).toBe('projects/import-job-not-found')
  })

  it('rejects jobs that are not committable', async () => {
    repository.retrieveJob.mockResolvedValueOnce(jobRow({ status: 'committed' }))
    const result = await service.commitJob('org_1', 'impj_1')
    expect(result.error?.code).toBe('projects/import-job-not-ready')
  })

  it('commits rows through the issues service in batches', async () => {
    repository.retrieveJob.mockResolvedValueOnce(jobRow({ bundle }))
    repository.listJobRows.mockResolvedValueOnce([persistedRow()])
    issues.create.mockResolvedValueOnce({ data: { id: 'iss_new' }, error: null })
    repository.updateJob.mockImplementation(async (_id: string, data: object) => jobRow(data))
    const result = await service.commitJob('org_1', 'impj_1')
    expect(result.error).toBeNull()
    expect(issues.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        projectId: 'prj_1',
        title: 'Ship it',
        labelIds: ['launch'],
      })
    )
    expect(repository.updateJobRow).toHaveBeenCalledWith(
      'impr_1',
      expect.objectContaining({ status: 'succeeded', createdId: 'iss_new' })
    )
    expect(result.data?.status).toBe('committed')
  })

  it('records per-row failures and stays resumable', async () => {
    const twoRows = {
      rows: [
        { kind: 'work-item', workItem: { title: 'Good' } },
        { kind: 'work-item', workItem: { title: 'Bad' } },
      ],
    }
    repository.retrieveJob.mockResolvedValueOnce(
      jobRow({ bundle: twoRows, rowCount: 2 })
    )
    repository.listJobRows.mockResolvedValueOnce([
      persistedRow({ id: 'impr_a', rowIndex: 0 }),
      persistedRow({ id: 'impr_b', rowIndex: 1 }),
    ])
    issues.create.mockResolvedValueOnce({ data: { id: 'iss_a' }, error: null })
    issues.create.mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/invalid-request', message: 'Bad', httpStatus: 400 },
    })
    repository.updateJob.mockImplementation(async (_id: string, data: object) => jobRow(data))
    const first = await service.commitJob('org_1', 'impj_1')
    expect(first.data?.status).toBe('partial')

    repository.retrieveJob.mockResolvedValueOnce(
      jobRow({ bundle: twoRows, rowCount: 2, status: 'partial', successCount: 1, failureCount: 1 })
    )
    repository.listJobRows.mockResolvedValueOnce([
      persistedRow({ id: 'impr_a', rowIndex: 0, status: 'succeeded', createdId: 'iss_a' }),
      persistedRow({ id: 'impr_b', rowIndex: 1, status: 'failed' }),
    ])
    issues.create.mockResolvedValueOnce({ data: { id: 'iss_b' }, error: null })
    repository.updateJob.mockImplementation(async (_id: string, data: object) => jobRow({ ...data, status: 'committed' }))
    const second = await service.commitJob('org_1', 'impj_1')
    expect(second.data?.status).toBe('committed')
    const createdTitles = issues.create.mock.calls.map(
      (call) => (call[1] as { title: string }).title
    )
    expect(createdTitles.filter((title) => title === 'Good')).toHaveLength(1)
  })

  it('commits time entries through the time service', async () => {
    const timeBundle = {
      rows: [
        {
          kind: 'time-entry',
          timeEntry: { userId: 'usr_1', startedAt: 1700000000, endedAt: 1700003600 },
        },
      ],
    }
    repository.retrieveJob.mockResolvedValueOnce(jobRow({ bundle: timeBundle }))
    repository.listJobRows.mockResolvedValueOnce([
      persistedRow({ kind: 'time-entry' }),
    ])
    time.createTimeEntry.mockResolvedValueOnce({
      data: { id: 'tme_1' },
      error: null,
    })
    repository.updateJob.mockImplementation(async (_id: string, data: object) => jobRow(data))
    const result = await service.commitJob('org_1', 'impj_1')
    expect(result.error).toBeNull()
    expect(time.createTimeEntry).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({ userId: 'usr_1', projectId: 'prj_1' })
    )
  })

  it('isolates jobs by tenant', async () => {
    tenants.resolveTenant.mockResolvedValueOnce({
      id: 'prjten_other',
      organizationId: 'org_other',
    })
    repository.retrieveJob.mockResolvedValueOnce(null)
    const result = await service.commitJob('org_other', 'impj_1')
    expect(result.error?.code).toBe('projects/import-job-not-found')
    expect(repository.retrieveJob).toHaveBeenCalledWith(
      'prjten_other',
      'impj_1'
    )
    expect(issues.create).not.toHaveBeenCalled()
  })
})
