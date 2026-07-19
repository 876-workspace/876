import 'server-only'

import {
  deletedKbArticleSchema,
  deletedKbCategorySchema,
  kbArticleListSchema,
  kbArticleSchema,
  kbCategoryListSchema,
  kbCategorySchema,
  type DeletedKbArticle,
  type DeletedKbCategory,
  type KbArticle,
  type KbArticleAudience,
  type KbArticleList,
  type KbArticleStatus,
  type KbCategory,
  type KbCategoryList,
  type KnowledgeWidgetHost,
} from '../types/knowledge'
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
    kb: {
      articles: {
        list(
          actor: Actor,
          params: {
            status?: KbArticleStatus
            host?: KnowledgeWidgetHost
            audience?: KbArticleAudience
            category_id?: string
            q?: string
            cursor?: string
            limit?: number
          } = {}
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: '/api/v1/admin/kb/articles',
              role: 'admin',
              query: {
                status: params.status,
                host: params.host,
                audience: params.audience,
                category_id: params.category_id,
                q: params.q,
                cursor: params.cursor,
                limit: params.limit,
              },
            },
            (data) => {
              const parsed = kbArticleListSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticleList>>
        },

        retrieve(actor: Actor, id: string) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: `/api/v1/admin/kb/articles/${encodeURIComponent(id)}`,
              role: 'admin',
            },
            (data) => {
              const parsed = kbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticle>>
        },

        create(
          actor: Actor,
          params: {
            slug: string
            title: string
            summary?: string
            body: string
            category_id?: string
            status?: KbArticleStatus
            audience?: KbArticleAudience
            hosts: KnowledgeWidgetHost[]
            featured?: boolean
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'POST',
              path: '/api/v1/admin/kb/articles',
              role: 'admin',
              body: params,
            },
            (data) => {
              const parsed = kbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticle>>
        },

        update(
          actor: Actor,
          id: string,
          params: {
            slug?: string
            title?: string
            summary?: string | null
            body?: string
            category_id?: string | null
            status?: KbArticleStatus
            audience?: KbArticleAudience
            hosts?: KnowledgeWidgetHost[]
            featured?: boolean
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'PATCH',
              path: `/api/v1/admin/kb/articles/${encodeURIComponent(id)}`,
              role: 'admin',
              body: params,
            },
            (data) => {
              const parsed = kbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticle>>
        },

        delete(actor: Actor, id: string) {
          return requestJson(
            config,
            actor,
            {
              method: 'DELETE',
              path: `/api/v1/admin/kb/articles/${encodeURIComponent(id)}`,
              role: 'admin',
            },
            (data) => {
              const parsed = deletedKbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<DeletedKbArticle>>
        },
      },

      categories: {
        list(actor: Actor, params: { host?: KnowledgeWidgetHost } = {}) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: '/api/v1/admin/kb/categories',
              role: 'admin',
              query: { host: params.host },
            },
            (data) => {
              const parsed = kbCategoryListSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbCategoryList>>
        },

        create(
          actor: Actor,
          params: {
            slug: string
            name: string
            description?: string
            parent_id?: string
            sort_order?: number
            hosts: KnowledgeWidgetHost[]
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'POST',
              path: '/api/v1/admin/kb/categories',
              role: 'admin',
              body: params,
            },
            (data) => {
              const parsed = kbCategorySchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbCategory>>
        },

        update(
          actor: Actor,
          id: string,
          params: {
            slug?: string
            name?: string
            description?: string | null
            parent_id?: string | null
            sort_order?: number
            hosts?: KnowledgeWidgetHost[]
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'PATCH',
              path: `/api/v1/admin/kb/categories/${encodeURIComponent(id)}`,
              role: 'admin',
              body: params,
            },
            (data) => {
              const parsed = kbCategorySchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbCategory>>
        },

        delete(actor: Actor, id: string) {
          return requestJson(
            config,
            actor,
            {
              method: 'DELETE',
              path: `/api/v1/admin/kb/categories/${encodeURIComponent(id)}`,
              role: 'admin',
            },
            (data) => {
              const parsed = deletedKbCategorySchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<DeletedKbCategory>>
        },
      },
    },

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
