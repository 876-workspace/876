import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  budgetVarianceReportSchema,
  healthReportSchema,
  timeReportSchema,
  workloadReportSchema,
  workReportSchema,
} from '../types'
import { createReportsResource } from './reports'

describe('reports resource', () => {
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('fetches the work report with period and project filters', async () => {
    const resource = createReportsResource(buildRuntime({ internalKey: 'key' }))
    await resource.work('org 1', {
      projectId: 'prj_1',
      from: 1000,
      to: 2000,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reports/work?projectId=prj_1&from=1000&to=2000',
        signal: undefined,
      },
      workReportSchema
    )
  })

  it('fetches the work report as CSV text through fetch', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('section,key,label,count\r\n', { status: 200 })
    )
    const resource = createReportsResource(
      buildRuntime({ internalKey: 'key', fetch: fetchMock })
    )
    const result = await resource.work('org 1', {
      from: 1000,
      to: 2000,
      format: 'csv',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/reports/work?from=1000&to=2000&format=csv'),
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toEqual({
      data: 'section,key,label,count\r\n',
      error: null,
    })
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('fetches the health report', async () => {
    const resource = createReportsResource(buildRuntime({ internalKey: 'key' }))
    await resource.health('org 1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reports/health',
        signal: undefined,
      },
      healthReportSchema
    )
  })

  it('fetches the time report with grouping and filters', async () => {
    const resource = createReportsResource(buildRuntime({ internalKey: 'key' }))
    await resource.time('org 1', {
      groupBy: 'user',
      from: 1000,
      to: 2000,
      projectId: 'prj_1',
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reports/time?groupBy=user&from=1000&to=2000&projectId=prj_1',
        signal: undefined,
      },
      timeReportSchema
    )
  })

  it('fetches the budget variance report', async () => {
    const resource = createReportsResource(buildRuntime({ internalKey: 'key' }))
    await resource.budgetVariance('org 1', { from: 1000, to: 2000 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reports/budget-variance?from=1000&to=2000',
        signal: undefined,
      },
      budgetVarianceReportSchema
    )
  })

  it('fetches the workload report', async () => {
    const resource = createReportsResource(buildRuntime({ internalKey: 'key' }))
    await resource.workload('org 1', { from: 1000, to: 2000 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/reports/workload?from=1000&to=2000',
        signal: undefined,
      },
      workloadReportSchema
    )
  })

  it('surfaces service errors for CSV requests', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'projects/invalid-period', message: 'Bad period.' },
          }),
          { status: 422 }
        )
    )
    const resource = createReportsResource(
      buildRuntime({ internalKey: 'key', fetch: fetchMock })
    )
    const result = await resource.health('org 1', { format: 'csv' })
    expect(result).toEqual({
      data: null,
      error: { code: 'projects/invalid-period', message: 'Bad period.' },
    })
  })

  it('validates the canonical work report contract', () => {
    const parsed = workReportSchema.safeParse({
      object: 'projects.work-report',
      period: { from: 1000, to: 2000 },
      byState: [{ key: 'todo', label: 'todo', count: 2 }],
      byType: [{ key: 'task', label: 'task', count: 2 }],
      byAssignee: [{ key: 'usr_1', label: 'usr_1', count: 2 }],
      overdue: 1,
      total: 2,
    })
    expect(parsed.success).toBe(true)
  })

  it('validates the canonical health, time, variance, and workload contracts', () => {
    expect(
      healthReportSchema.safeParse({
        object: 'projects.health-report',
        data: [
          {
            projectId: 'prj_1',
            name: 'Alpha',
            health: 'at-risk',
            progressPercent: 50,
            overdue: 1,
            openItems: 2,
            budgetConsumedPercent: 85,
          },
        ],
      }).success
    ).toBe(true)
    expect(
      timeReportSchema.safeParse({
        object: 'projects.time-report',
        groupBy: 'project',
        period: { from: 1000, to: 2000 },
        data: [
          { key: 'prj_1', label: 'Alpha', billableMinutes: 60, nonBillableMinutes: 30 },
        ],
      }).success
    ).toBe(true)
    expect(
      budgetVarianceReportSchema.safeParse({
        object: 'projects.budget-variance-report',
        period: { from: 1000, to: 2000 },
        data: [
          {
            projectId: 'prj_1',
            name: 'Alpha',
            currency: 'USD',
            budgetMinor: '10000',
            actualCostMinor: '6000',
            varianceMinor: '-4000',
            budgetMinutes: null,
            actualMinutes: 120,
          },
        ],
      }).success
    ).toBe(true)
    expect(
      workloadReportSchema.safeParse({
        object: 'projects.workload-report',
        period: { from: 1000, to: 2000 },
        data: [
          {
            userId: 'usr_1',
            label: 'usr_1',
            assignedOpenItems: 1,
            plannedMinutes: 3,
            loggedMinutes: 60,
            capacityMinutes: 2400,
            utilisationPercent: 3,
          },
        ],
      }).success
    ).toBe(true)
  })
})
