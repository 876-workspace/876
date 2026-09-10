import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  linkWorkRemoteCalendarInputSchema,
  workRemoteCalendarListSchema,
  workSyncAuthorizationSchema,
  workSyncCalendarLinkListSchema,
  workSyncCalendarLinkSchema,
  workSyncConnectionSetupInputSchema,
  workSyncRunSchema,
  type LinkWorkRemoteCalendarInput,
  type WorkSyncConnectionSetupInput,
} from '../sync-contracts'
import {
  workSyncConnectionListSchema,
  workSyncConnectionSchema,
  type CreateWorkSyncConnectionInput,
  type UpdateWorkSyncConnectionInput,
  type WorkSyncConnectionListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/sync-connections`
}

function connectionPath(organizationId: string, connectionId: string) {
  return `${root(organizationId)}/${encodeURIComponent(connectionId)}`
}

function listPath(
  organizationId: string,
  filter: WorkSyncConnectionListFilter
) {
  const params = new URLSearchParams()
  if (filter.userId) params.set('user_id', filter.userId)
  if (filter.provider) params.set('provider', filter.provider)
  if (filter.status) params.set('status', filter.status)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

const deletedMappingSchema = z.object({
  object: z.literal('sync_mapping'),
  id: z.string(),
  deleted: z.literal(true),
})

export function createSyncConnectionsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkSyncConnectionListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workSyncConnectionListSchema
      )
    },
    retrieve(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: connectionPath(organizationId, connectionId) },
        workSyncConnectionSchema
      )
    },
    /** Integration-tier primitive. Session callers should use setup(). */
    create(organizationId: string, input: CreateWorkSyncConnectionInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workSyncConnectionSchema
      )
    },
    /** Integration-tier primitive. */
    update(
      organizationId: string,
      connectionId: string,
      input: UpdateWorkSyncConnectionInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: connectionPath(organizationId, connectionId),
          body: input,
        },
        workSyncConnectionSchema
      )
    },
    delete(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: connectionPath(organizationId, connectionId),
        },
        z.object({
          object: z.literal('sync_connection'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
    setup(organizationId: string, input: WorkSyncConnectionSetupInput) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/setup`,
          body: workSyncConnectionSetupInputSchema.parse(input),
        },
        workSyncConnectionSchema
      )
    },
    authorize(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: `${connectionPath(organizationId, connectionId)}/authorize`,
        },
        workSyncAuthorizationSchema
      )
    },
    remoteCalendars(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `${connectionPath(organizationId, connectionId)}/remote-calendars`,
        },
        workRemoteCalendarListSchema
      )
    },
    calendarLinks: {
      list(organizationId: string, connectionId: string) {
        return workRequest(
          runtime,
          {
            method: 'GET',
            path: `${connectionPath(organizationId, connectionId)}/calendar-links`,
          },
          workSyncCalendarLinkListSchema
        )
      },
      create(
        organizationId: string,
        connectionId: string,
        input: LinkWorkRemoteCalendarInput
      ) {
        return workRequest(
          runtime,
          {
            method: 'POST',
            path: `${connectionPath(organizationId, connectionId)}/calendar-links`,
            body: linkWorkRemoteCalendarInputSchema.parse(input),
          },
          workSyncCalendarLinkSchema
        )
      },
      delete(
        organizationId: string,
        connectionId: string,
        mappingId: string
      ) {
        return workRequest(
          runtime,
          {
            method: 'DELETE',
            path: `${connectionPath(organizationId, connectionId)}/calendar-links/${encodeURIComponent(mappingId)}`,
          },
          deletedMappingSchema
        )
      },
      sync(
        organizationId: string,
        connectionId: string,
        mappingId: string
      ) {
        return workRequest(
          runtime,
          {
            method: 'POST',
            path: `${connectionPath(organizationId, connectionId)}/calendar-links/${encodeURIComponent(mappingId)}/sync`,
          },
          workSyncRunSchema
        )
      },
    },
    sync(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: `${connectionPath(organizationId, connectionId)}/sync`,
        },
        workSyncRunSchema
      )
    },
  }
}
