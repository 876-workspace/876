import 'server-only'

import {
  collectionListSchema,
  deletedCollectionSchema,
  notepadCollectionSchema,
  type CollectionList,
  type DeletedCollection,
  type NotepadCollection,
} from '../types/collections'
import {
  deletedNoteSchema,
  noteListSchema,
  notepadNoteSchema,
  toNoteBody,
  toNoteListQuery,
  type DeletedNote,
  type NoteColor,
  type NoteCreateParams,
  type NoteList,
  type NoteListParams,
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

export type { CreateWidgetsClientOptions, WidgetsClientResult } from './request'

/**
 * Server-only client for apps/widgets-api.
 * Hosts authorize the end user, then call with the service key + actor id.
 */
export function createWidgetsClient(options: CreateWidgetsClientOptions = {}) {
  const config = resolveConfig(options)

  return {
    notes: {
      list(actor: Actor, params: NoteListParams = {}) {
        return requestJson(
          config,
          actor,
          {
            method: 'GET',
            path: '/api/v1/notes',
            query: toNoteListQuery(params),
          },
          (data) => {
            const parsed = noteListSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NoteList>>
      },

      create(actor: Actor, params: NoteCreateParams) {
        return requestJson(
          config,
          actor,
          { method: 'POST', path: '/api/v1/notes', body: toNoteBody(params) },
          (data) => {
            const parsed = notepadNoteSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NotepadNote>>
      },

      update(actor: Actor, id: string, params: NoteWriteParams) {
        return requestJson(
          config,
          actor,
          {
            method: 'PATCH',
            path: `/api/v1/notes/${encodeURIComponent(id)}`,
            body: toNoteBody(params),
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

    collections: {
      list(actor: Actor) {
        return requestJson(
          config,
          actor,
          { method: 'GET', path: '/api/v1/collections' },
          (data) => {
            const parsed = collectionListSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<CollectionList>>
      },

      create(actor: Actor, params: { name: string; color?: NoteColor | null }) {
        return requestJson(
          config,
          actor,
          { method: 'POST', path: '/api/v1/collections', body: params },
          (data) => {
            const parsed = notepadCollectionSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NotepadCollection>>
      },

      update(
        actor: Actor,
        id: string,
        params: { name?: string; color?: NoteColor | null }
      ) {
        return requestJson(
          config,
          actor,
          {
            method: 'PATCH',
            path: `/api/v1/collections/${encodeURIComponent(id)}`,
            body: params,
          },
          (data) => {
            const parsed = notepadCollectionSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<NotepadCollection>>
      },

      delete(actor: Actor, id: string) {
        return requestJson(
          config,
          actor,
          {
            method: 'DELETE',
            path: `/api/v1/collections/${encodeURIComponent(id)}`,
          },
          (data) => {
            const parsed = deletedCollectionSchema.safeParse(data)
            return parsed.success ? parsed.data : null
          }
        ) as Promise<WidgetsClientResult<DeletedCollection>>
      },
    },
  }
}

export type WidgetsClient = ReturnType<typeof createWidgetsClient>
