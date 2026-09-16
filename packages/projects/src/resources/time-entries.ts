import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  timeEntryListSchema,
  timeEntrySchema,
  timerStartResultSchema,
  timeSummarySchema,
  type CreateTimeEntryInput,
  type GetTimeSummaryQuery,
  type ListTimeEntriesQuery,
  type RequestOptions,
  type StartTimerInput,
  type StopTimerInput,
  type UpdateTimeEntryInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/time-entries`
}

function summaryRoot(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/time-summary`
}

function toListQuery(query: ListTimeEntriesQuery): string {
  const search = new URLSearchParams()
  if (query.userId !== undefined) search.set('userId', query.userId)
  if (query.projectId !== undefined) search.set('projectId', query.projectId)
  if (query.issueId !== undefined) search.set('issueId', query.issueId)
  if (query.from !== undefined) search.set('from', String(query.from))
  if (query.to !== undefined) search.set('to', String(query.to))
  if (query.billable !== undefined) search.set('billable', String(query.billable))
  if (query.approvalStatus !== undefined)
    search.set('approvalStatus', query.approvalStatus)
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export function createTimeEntriesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListTimeEntriesQuery & RequestOptions = {}
    ) {
      const { signal, ...filters } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toListQuery(filters)}`,
          signal,
        },
        timeEntryListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateTimeEntryInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        timeEntrySchema
      )
    },
    retrieve(
      organizationId: string,
      timeEntryId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(timeEntryId)}`,
          signal: options.signal,
        },
        timeEntrySchema
      )
    },
    update(
      organizationId: string,
      timeEntryId: string,
      userId: string,
      input: UpdateTimeEntryInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(timeEntryId)}`,
          body: { ...input, userId },
          signal: options.signal,
        },
        timeEntrySchema
      )
    },
    delete(
      organizationId: string,
      timeEntryId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(timeEntryId)}?${search.toString()}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    startTimer(
      organizationId: string,
      input: StartTimerInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/timer/start`,
          body: input,
          signal: options.signal,
        },
        timerStartResultSchema
      )
    },
    stopTimer(
      organizationId: string,
      input: StopTimerInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/timer/stop`,
          body: input,
          signal: options.signal,
        },
        timeEntrySchema
      )
    },
    currentTimer(
      organizationId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/timer/current?${search.toString()}`,
          signal: options.signal,
        },
        timeEntrySchema.nullable()
      )
    },
    summary(
      organizationId: string,
      query: GetTimeSummaryQuery & RequestOptions
    ) {
      const { groupBy, from, to, userId, projectId, issueId, signal } = query
      const search = new URLSearchParams()
      search.set('groupBy', groupBy)
      search.set('from', String(from))
      search.set('to', String(to))
      if (userId !== undefined) search.set('userId', userId)
      if (projectId !== undefined) search.set('projectId', projectId)
      if (issueId !== undefined) search.set('issueId', issueId)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${summaryRoot(organizationId)}?${search.toString()}`,
          signal,
        },
        timeSummarySchema
      )
    },
  }
}
