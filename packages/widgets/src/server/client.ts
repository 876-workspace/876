import 'server-only'

import {
  deletedNoteSchema,
  noteListSchema,
  notepadNoteSchema,
  type DeletedNote,
  type NoteColor,
  type NoteList,
  type NotepadNote,
} from '../types/notes'
import {
  requestJson,
  resolveConfig,
  type Actor,
  type CreateWidgetsClientOptions,
  type WidgetsClientResult,
} from './request'

export type { CreateWidgetsClientOptions, WidgetsClientResult } from './request'

/**
 * Server-only client for apps/widgets-api.
 * Hosts authorize the end user, then call with the service key + actor id.
 */
export function createWidgetsClient(options: CreateWidgetsClientOptions = {}) {
  const config = resolveConfig(options)

  return {
    notes: {
      list(
        actor: Actor,
        params: { limit?: number; starting_after?: string } = {}
      ) {
        return requestJson(
          config,
          actor,
          {
            method: 'GET',
            path: '/api/v1/notes',
            query: {
              limit: params.limit,
              starting_after: params.starting_after,
            },
          },
          (data) => {
            const parsed = noteListSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NoteList>>
      },

      create(
        actor: Actor,
        params: {
          title: string
          body: string
          color?: NoteColor
          pinned?: boolean
        }
      ) {
        return requestJson(
          config,
          actor,
          { method: 'POST', path: '/api/v1/notes', body: params },
          (data) => {
            const parsed = notepadNoteSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NotepadNote>>
      },

      update(
        actor: Actor,
        id: string,
        params: {
          title?: string
          body?: string
          color?: NoteColor
          pinned?: boolean
        }
      ) {
        return requestJson(
          config,
          actor,
          {
            method: 'PATCH',
            path: `/api/v1/notes/${encodeURIComponent(id)}`,
            body: params,
          },
          (data) => {
            const parsed = notepadNoteSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NotepadNote>>
      },

      delete(actor: Actor, id: string) {
        return requestJson(
          config,
          actor,
          {
            method: 'DELETE',
            path: `/api/v1/notes/${encodeURIComponent(id)}`,
          },
          (data) => {
            const parsed = deletedNoteSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<DeletedNote>>
      },
    },
  }
}

export type WidgetsClient = ReturnType<typeof createWidgetsClient>
