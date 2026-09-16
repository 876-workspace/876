import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { ganttSchema } from '../types'
import { createGanttResource } from './gantt'

describe('gantt resource', () => {
  const resource = createGanttResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('retrieves the gantt read model with default query', async () => {
    await resource.retrieve('org 1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/gantt',
        signal: undefined,
      },
      ganttSchema
    )
  })

  it('passes zoom and includeSubItems as query params', async () => {
    await resource.retrieve('org 1', 'prj_1', {
      zoom: 'month',
      includeSubItems: false,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: expect.stringContaining('zoom=month'),
      }),
      ganttSchema
    )
    const path = requestMock.mock.calls[0]?.[1]?.path as string
    expect(path).toContain('includeSubItems=false')
  })

  it('encodes organization and project ids', async () => {
    await resource.retrieve('org/a', 'prj/b', { zoom: 'day' })
    const path = requestMock.mock.calls[0]?.[1]?.path as string
    expect(path).toContain('org%2Fa')
    expect(path).toContain('prj%2Fb')
  })

  it('forwards an abort signal', async () => {
    const controller = new AbortController()
    await resource.retrieve('org_1', 'prj_1', { signal: controller.signal })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
      ganttSchema
    )
  })

  it('validates the gantt payload shape', () => {
    const parsed = ganttSchema.safeParse({
      object: 'gantt',
      rows: [
        {
          object: 'gantt-row',
          id: 'work-item:iss_1',
          kind: 'work-item',
          parentRowId: 'task-list:tl_1',
          issueId: 'iss_1',
          name: 'Build',
          plannedStart: 1000,
          plannedFinish: 2000,
          actualStart: null,
          actualFinish: null,
          percentComplete: 0,
          isCritical: true,
        },
      ],
      edges: [
        {
          object: 'gantt-edge',
          id: 'isd_1',
          predecessorIssueId: 'iss_1',
          successorIssueId: 'iss_2',
          type: 'finish-to-start',
          lagMinutes: 0,
        },
      ],
      criticalIssueIds: ['iss_1'],
      range: { start: 1000, end: 2000 },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects rows with an unknown kind', () => {
    const parsed = ganttSchema.safeParse({
      object: 'gantt',
      rows: [
        {
          object: 'gantt-row',
          id: 'x',
          kind: 'epic',
          parentRowId: null,
          issueId: null,
          name: 'X',
          plannedStart: null,
          plannedFinish: null,
          actualStart: null,
          actualFinish: null,
          percentComplete: 0,
          isCritical: false,
        },
      ],
      edges: [],
      criticalIssueIds: [],
      range: { start: null, end: null },
    })
    expect(parsed.success).toBe(false)
  })
})
