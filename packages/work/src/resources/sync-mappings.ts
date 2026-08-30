import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workSyncMappingListSchema,
  workSyncMappingSchema,
  type CreateWorkSyncMappingInput,
  type UpdateWorkSyncMappingInput,
} from '../types'

function root(organizationId: string, connectionId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/sync-connections/${encodeURIComponent(connectionId)}/mappings`
}

export function createSyncMappingsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, connectionId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: root(organizationId, connectionId) },
        workSyncMappingListSchema
      )
    },
    create(
      organizationId: string,
      connectionId: string,
      input: CreateWorkSyncMappingInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, connectionId),
          body: input,
        },
        workSyncMappingSchema
      )
    },
    update(
      organizationId: string,
      connectionId: string,
      mappingId: string,
      input: UpdateWorkSyncMappingInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, connectionId)}/${encodeURIComponent(mappingId)}`,
          body: input,
        },
        workSyncMappingSchema
      )
    },
    delete(organizationId: string, connectionId: string, mappingId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, connectionId)}/${encodeURIComponent(mappingId)}`,
        },
        z.object({
          object: z.literal('sync_mapping'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
