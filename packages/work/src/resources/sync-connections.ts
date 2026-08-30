import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
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

function listPath(organizationId: string, filter: WorkSyncConnectionListFilter) {
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

export function createSyncConnectionsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkSyncConnectionListFilter = {}) {
      return workRequest(runtime, { method: 'GET', path: listPath(organizationId, filter) }, workSyncConnectionListSchema)
    },
    retrieve(organizationId: string, connectionId: string) {
      return workRequest(runtime, { method: 'GET', path: `${root(organizationId)}/${encodeURIComponent(connectionId)}` }, workSyncConnectionSchema)
    },
    create(organizationId: string, input: CreateWorkSyncConnectionInput) {
      return workRequest(runtime, { method: 'POST', path: root(organizationId), body: input }, workSyncConnectionSchema)
    },
    update(organizationId: string, connectionId: string, input: UpdateWorkSyncConnectionInput) {
      return workRequest(runtime, { method: 'PATCH', path: `${root(organizationId)}/${encodeURIComponent(connectionId)}`, body: input }, workSyncConnectionSchema)
    },
    delete(organizationId: string, connectionId: string) {
      return workRequest(runtime, { method: 'DELETE', path: `${root(organizationId)}/${encodeURIComponent(connectionId)}` }, z.object({ object: z.literal('sync_connection'), id: z.string(), deleted: z.literal(true) }))
    },
  }
}
