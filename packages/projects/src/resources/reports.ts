import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  budgetVarianceReportSchema,
  healthReportSchema,
  timeReportSchema,
  workloadReportSchema,
  workReportSchema,
  type BudgetVarianceReport,
  type GetBudgetVarianceReportQuery,
  type GetHealthReportQuery,
  type GetTimeReportQuery,
  type GetWorkloadReportQuery,
  type GetWorkReportQuery,
  type HealthReport,
  type RequestOptions,
  type Result,
  type TimeReport,
  type WorkloadReport,
  type WorkReport,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}`
}

function formatSuffix(format: string | undefined): string {
  return format === 'csv' ? '&format=csv' : ''
}

async function requestText(
  runtime: Runtime,
  path: string,
  signal?: AbortSignal
): Promise<Result<string>> {
  if (!runtime.internalKey)
    return {
      data: null,
      error: {
        code: 'projects/not-configured',
        message: 'The Projects client is not configured.',
      },
    }
  const response = await runtime.fetch(`${runtime.baseUrl}${path}`, {
    method: 'GET',
    headers: {
      'x-internal-key': runtime.internalKey,
      ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
    },
    signal,
  })
  if (!response.ok) {
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string } | null
      }
      if (payload?.error?.code)
        return {
          data: null,
          error: {
            code: payload.error.code,
            message:
              payload.error.message ?? 'The Projects service returned an error.',
          },
        }
    } catch {
      // Fall through to the generic invalid-response error below.
    }
    return {
      data: null,
      error: {
        code: 'projects/invalid-response',
        message: 'The Projects service returned an invalid response.',
      },
    }
  }
  return { data: await response.text(), error: null }
}

export function createReportsResource(runtime: Runtime) {
  async function work(
    organizationId: string,
    query: GetWorkReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function work(
    organizationId: string,
    query: GetWorkReportQuery & RequestOptions
  ): Promise<Result<WorkReport>>
  async function work(
    organizationId: string,
    query: GetWorkReportQuery & RequestOptions
  ): Promise<Result<WorkReport | string>> {
    const { projectId, from, to, format, signal } = query
    const search = new URLSearchParams()
    if (projectId !== undefined) search.set('projectId', projectId)
    search.set('from', String(from))
    search.set('to', String(to))
    const path = `${root(organizationId)}/reports/work?${search.toString()}${formatSuffix(format)}`
    if (format === 'csv') return requestText(runtime, path, signal)
    return request(runtime, { method: 'GET', path, signal }, workReportSchema)
  }

  async function health(
    organizationId: string,
    query: GetHealthReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function health(
    organizationId: string,
    query?: GetHealthReportQuery & RequestOptions
  ): Promise<Result<HealthReport>>
  async function health(
    organizationId: string,
    query: GetHealthReportQuery & RequestOptions = {}
  ): Promise<Result<HealthReport | string>> {
    const { format, signal } = query
    const path = `${root(organizationId)}/reports/health${format === 'csv' ? '?format=csv' : ''}`
    if (format === 'csv') return requestText(runtime, path, signal)
    return request(runtime, { method: 'GET', path, signal }, healthReportSchema)
  }

  async function time(
    organizationId: string,
    query: GetTimeReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function time(
    organizationId: string,
    query: GetTimeReportQuery & RequestOptions
  ): Promise<Result<TimeReport>>
  async function time(
    organizationId: string,
    query: GetTimeReportQuery & RequestOptions
  ): Promise<Result<TimeReport | string>> {
    const { groupBy, from, to, projectId, format, signal } = query
    const search = new URLSearchParams()
    search.set('groupBy', groupBy)
    search.set('from', String(from))
    search.set('to', String(to))
    if (projectId !== undefined) search.set('projectId', projectId)
    const path = `${root(organizationId)}/reports/time?${search.toString()}${formatSuffix(format)}`
    if (format === 'csv') return requestText(runtime, path, signal)
    return request(runtime, { method: 'GET', path, signal }, timeReportSchema)
  }

  async function budgetVariance(
    organizationId: string,
    query: GetBudgetVarianceReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function budgetVariance(
    organizationId: string,
    query: GetBudgetVarianceReportQuery & RequestOptions
  ): Promise<Result<BudgetVarianceReport>>
  async function budgetVariance(
    organizationId: string,
    query: GetBudgetVarianceReportQuery & RequestOptions
  ): Promise<Result<BudgetVarianceReport | string>> {
    const { from, to, format, signal } = query
    const search = new URLSearchParams()
    search.set('from', String(from))
    search.set('to', String(to))
    const path = `${root(organizationId)}/reports/budget-variance?${search.toString()}${formatSuffix(format)}`
    if (format === 'csv') return requestText(runtime, path, signal)
    return request(
      runtime,
      { method: 'GET', path, signal },
      budgetVarianceReportSchema
    )
  }

  async function workload(
    organizationId: string,
    query: GetWorkloadReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function workload(
    organizationId: string,
    query: GetWorkloadReportQuery & RequestOptions
  ): Promise<Result<WorkloadReport>>
  async function workload(
    organizationId: string,
    query: GetWorkloadReportQuery & RequestOptions
  ): Promise<Result<WorkloadReport | string>> {
    const { from, to, projectId, format, signal } = query
    const search = new URLSearchParams()
    search.set('from', String(from))
    search.set('to', String(to))
    if (projectId !== undefined) search.set('projectId', projectId)
    const path = `${root(organizationId)}/reports/workload?${search.toString()}${formatSuffix(format)}`
    if (format === 'csv') return requestText(runtime, path, signal)
    return request(
      runtime,
      { method: 'GET', path, signal },
      workloadReportSchema
    )
  }

  return { work, health, time, budgetVariance, workload }
}
