import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  timesheetDetailSchema,
  timesheetEventListSchema,
  timesheetListSchema,
  type ApproveTimesheetInput,
  type CreateTimesheetInput,
  type ListTimesheetsQuery,
  type RejectTimesheetInput,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/timesheets`
}

function item(organizationId: string, timesheetId: string) {
  return `${root(organizationId)}/${encodeURIComponent(timesheetId)}`
}

export function createTimesheetsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListTimesheetsQuery & RequestOptions = {}
    ) {
      const { userId, status, signal } = query
      const search = new URLSearchParams()
      if (userId !== undefined) search.set('userId', userId)
      if (status !== undefined) search.set('status', status)
      const suffix = search.toString()
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${suffix ? `?${suffix}` : ''}`,
          signal,
        },
        timesheetListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateTimesheetInput,
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
        timesheetDetailSchema
      )
    },
    retrieve(
      organizationId: string,
      timesheetId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: item(organizationId, timesheetId),
          signal: options.signal,
        },
        timesheetDetailSchema
      )
    },
    submit(
      organizationId: string,
      timesheetId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${item(organizationId, timesheetId)}/submit`,
          body: { userId },
          signal: options.signal,
        },
        timesheetDetailSchema
      )
    },
    approve(
      organizationId: string,
      timesheetId: string,
      input: ApproveTimesheetInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${item(organizationId, timesheetId)}/approve`,
          body: input,
          signal: options.signal,
        },
        timesheetDetailSchema
      )
    },
    reject(
      organizationId: string,
      timesheetId: string,
      input: RejectTimesheetInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${item(organizationId, timesheetId)}/reject`,
          body: input,
          signal: options.signal,
        },
        timesheetDetailSchema
      )
    },
    recall(
      organizationId: string,
      timesheetId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${item(organizationId, timesheetId)}/recall`,
          body: { userId },
          signal: options.signal,
        },
        timesheetDetailSchema
      )
    },
    events(
      organizationId: string,
      timesheetId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${item(organizationId, timesheetId)}/events`,
          signal: options.signal,
        },
        timesheetEventListSchema
      )
    },
  }
}
