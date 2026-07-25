import 'server-only'

import {
  deletedNoteSchema,
  noteListSchema,
  notepadNoteSchema,
  toAdminNoteListQuery,
  toNoteBody,
  type AdminNoteListParams,
  type DeletedNote,
  type NoteList,
  type NotepadNote,
  type NoteWriteParams,
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
      list(actor: Actor, params: AdminNoteListParams = {}) {
        return requestJson(
          config,
          actor,
          {
            method: 'GET',
            path: '/api/v1/admin/notes',
            role: 'admin',
            query: toAdminNoteListQuery(params),
          },
          (data) => {
            const parsed = noteListSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NoteList>>
      },

      update(actor: Actor, id: string, params: NoteWriteParams) {
        return requestJson(
          config,
          actor,
          {
            method: 'PATCH',
            path: `/api/v1/admin/notes/${encodeURIComponent(id)}`,
            body: toNoteBody(params),
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
