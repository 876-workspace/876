import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  crmRequestNoteSchema,
  deletedSchema,
  requestNoteListSchema,
  type CreateRequestNoteInput,
  type DeleteRequestNoteInput,
  type ListRequestNotesInput,
  type RequestOptions,
  type UpdateRequestNoteInput,
} from '../types'

function root(organizationId: string, requestId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests/${encodeURIComponent(requestId)}/notes`
}

export function createRequestNotesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      requestId: string,
      options: ListRequestNotesInput & RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      if (options.viewerId) search.set('viewer_id', options.viewerId)
      if (options.includePrivate) search.set('include_private', 'true')
      const query = search.toString()

      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, requestId)}${query ? `?${query}` : ''}`,
          signal: options.signal,
        },
        requestNoteListSchema
      )
    },
    create(
      organizationId: string,
      requestId: string,
      input: CreateRequestNoteInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, requestId),
          body: input,
          signal: options.signal,
        },
        crmRequestNoteSchema
      )
    },
    update(
      organizationId: string,
      requestId: string,
      noteId: string,
      input: UpdateRequestNoteInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(noteId)}`,
          body: input,
          signal: options.signal,
        },
        crmRequestNoteSchema
      )
    },
    delete(
      organizationId: string,
      requestId: string,
      noteId: string,
      input: DeleteRequestNoteInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(noteId)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_note') })
      )
    },
  }
}
