import { beforeEach, describe, expect, it, vi } from 'vitest'

const { issues, time } = vi.hoisted(() => ({
  issues: { list: vi.fn() },
  time: { listTimeEntries: vi.fn() },
}))

vi.mock('../../issues/index.js', () => issues)
vi.mock('../../time/index.js', () => time)

const service = await import('../exports.service.js')

function issueItem(overrides = {}) {
  return {
    id: 'iss_1',
    identifier: 'CONSOLE-1',
    title: 'Ship it',
    status: 'todo',
    typeKey: 'task',
    priority: 'high',
    assigneeUserId: null,
    dueDate: null,
    projectKey: 'CONSOLE',
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildWorkItemsCsv', () => {
  it('exports rows with headers', async () => {
    issues.list.mockResolvedValueOnce({
      data: { items: [issueItem()], hasMore: false, totalCount: 1 },
      error: null,
    })
    const result = await service.buildWorkItemsCsv('org_1', {})
    expect('csv' in result && result.count).toBe(1)
    const csv = (result as { csv: string }).csv
    expect(csv.split('\r\n')[0]).toBe(
      'identifier,title,status,typeKey,priority,assigneeUserId,dueDate,projectKey,createdAt,updatedAt'
    )
    expect(csv).toContain('CONSOLE-1,Ship it')
  })

  it('guards formula injection', async () => {
    issues.list.mockResolvedValueOnce({
      data: {
        items: [issueItem({ title: '=HYPERLINK("http://evil")' })],
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
    const result = await service.buildWorkItemsCsv('org_1', {})
    const csv = (result as { csv: string }).csv
    expect(csv).toContain("'=HYPERLINK")
  })

  it('follows pagination cursors', async () => {
    issues.list
      .mockResolvedValueOnce({
        data: { items: [issueItem({ id: 'iss_1' })], hasMore: true, totalCount: 2 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          items: [issueItem({ id: 'iss_2', identifier: 'CONSOLE-2' })],
          hasMore: false,
          totalCount: 2,
        },
        error: null,
      })
    const result = await service.buildWorkItemsCsv('org_1', {})
    expect('csv' in result && result.count).toBe(2)
    expect(issues.list).toHaveBeenLastCalledWith(
      'org_1',
      expect.objectContaining({ starting_after: 'iss_1' })
    )
  })

  it('propagates service errors', async () => {
    issues.list.mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing', httpStatus: 404 },
    })
    const result = await service.buildWorkItemsCsv('org_1', {})
    expect(result).toEqual({
      error: expect.objectContaining({ code: 'projects/tenant-not-found' }),
    })
  })
})

describe('buildTimeEntriesCsv', () => {
  it('exports time entries with headers', async () => {
    time.listTimeEntries.mockResolvedValueOnce({
      data: [
        {
          id: 'tme_1',
          userId: 'usr_1',
          projectId: 'prj_1',
          issueId: null,
          startedAt: 1700000000,
          endedAt: 1700003600,
          durationMinutes: 60,
          billable: true,
          note: '=1+1',
        },
      ],
      error: null,
    })
    const result = await service.buildTimeEntriesCsv('org_1', {})
    const csv = (result as { csv: string }).csv
    expect(csv.split('\r\n')[0]).toBe(
      'id,userId,projectId,issueId,startedAt,endedAt,durationMinutes,billable,note'
    )
    expect(csv).toContain("'=1+1")
  })

  it('passes filters through', async () => {
    time.listTimeEntries.mockResolvedValueOnce({ data: [], error: null })
    await service.buildTimeEntriesCsv('org_1', {
      projectId: 'prj_1',
      userId: 'usr_1',
      from: 1,
      to: 2,
    })
    expect(time.listTimeEntries).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({ projectId: 'prj_1', userId: 'usr_1' })
    )
  })
})
