'use client'

import { requestApiResult } from '@876/core/client'

import type {
  LinkWorkRemoteCalendarInput,
  WorkRemoteCalendar,
  WorkSyncAuthorization,
  WorkSyncCalendarLink,
  WorkSyncConnectionSetupInput,
  WorkSyncConnectionSummary,
  WorkSyncRun,
} from './sync-contracts'

type WorkSyncConnectionSummaryPage = {
  object: 'list'
  data: WorkSyncConnectionSummary[]
  has_more: boolean
  total_count: number | null
  url: string
}

type WorkRemoteCalendarPage = {
  object: 'list'
  data: WorkRemoteCalendar[]
  has_more: false
  total_count: number
  url: string
}

type WorkSyncCalendarLinkPage = {
  object: 'list'
  data: WorkSyncCalendarLink[]
  has_more: false
  total_count: number
  url: string
}

type DeletedSyncResource = {
  object: 'sync_connection' | 'sync_mapping'
  id: string
  deleted: true
}

function connectionPath(routeBase: string, connectionId: string) {
  return `${routeBase}/connections/${encodeURIComponent(connectionId)}`
}

export function createBrowserWorkCalendarSync(
  routeBase = '/api/calendar-sync'
) {
  const base = routeBase.replace(/\/$/, '')
  const connectionsPath = `${base}/connections`

  return {
    connections: {
      list() {
        return requestApiResult<WorkSyncConnectionSummaryPage>(connectionsPath)
      },
      setup(input: WorkSyncConnectionSetupInput) {
        return requestApiResult<WorkSyncConnectionSummary>(connectionsPath, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      delete(connectionId: string) {
        return requestApiResult<DeletedSyncResource>(
          connectionPath(base, connectionId),
          { method: 'DELETE' }
        )
      },
      authorize(connectionId: string) {
        return requestApiResult<WorkSyncAuthorization>(
          `${connectionPath(base, connectionId)}/authorize`,
          { method: 'POST' }
        )
      },
      remoteCalendars(connectionId: string) {
        return requestApiResult<WorkRemoteCalendarPage>(
          `${connectionPath(base, connectionId)}/remote-calendars`
        )
      },
      sync(connectionId: string) {
        return requestApiResult<WorkSyncRun>(
          `${connectionPath(base, connectionId)}/sync`,
          { method: 'POST' }
        )
      },
      calendarLinks: {
        list(connectionId: string) {
          return requestApiResult<WorkSyncCalendarLinkPage>(
            `${connectionPath(base, connectionId)}/calendar-links`
          )
        },
        create(connectionId: string, input: LinkWorkRemoteCalendarInput) {
          return requestApiResult<WorkSyncCalendarLink>(
            `${connectionPath(base, connectionId)}/calendar-links`,
            { method: 'POST', body: JSON.stringify(input) }
          )
        },
        delete(connectionId: string, mappingId: string) {
          return requestApiResult<DeletedSyncResource>(
            `${connectionPath(base, connectionId)}/calendar-links/${encodeURIComponent(mappingId)}`,
            { method: 'DELETE' }
          )
        },
        sync(connectionId: string, mappingId: string) {
          return requestApiResult<WorkSyncRun>(
            `${connectionPath(base, connectionId)}/calendar-links/${encodeURIComponent(mappingId)}/sync`,
            { method: 'POST' }
          )
        },
      },
    },
  } as const
}

export type WorkBrowserCalendarSyncClient = ReturnType<
  typeof createBrowserWorkCalendarSync
>
