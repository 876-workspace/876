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

export function createWidgetsAdminClient(
  options: CreateWidgetsClientOptions = {}
) {
  const config = resolveConfig(options)

  return {
    notes: {
      list(
        actor: Actor,
        params: {
          owner_account_id?: string
          limit?: number
          starting_after?: string
        } = {}
      ) {
        return requestJson(
          config,
          actor,
          {
            method: 'GET',
            path: '/api/v1/admin/notes',
            role: 'admin',
            query: {
              owner_account_id: params.owner_account_id,
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
            path: `/api/v1/admin/notes/${encodeURIComponent(id)}`,
            body: params,
            role: 'admin',
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
            path: `/api/v1/admin/notes/${encodeURIComponent(id)}`,
            role: 'admin',
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

export type WidgetsAdminClient = ReturnType<typeof createWidgetsAdminClient>
