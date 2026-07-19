import 'server-only'

import {
  kbArticleListSchema,
  kbArticleSchema,
  kbBookmarkListSchema,
  kbBookmarkSchema,
  kbCategoryListSchema,
  type KbArticle,
  type KbArticleAudience,
  type KbArticleList,
  type KbBookmark,
  type KbBookmarkList,
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

export type { CreateWidgetsClientOptions, WidgetsClientResult } from './request'

/**
 * Server-only client for apps/widgets-api.
 * Hosts authorize the end user, then call with the service key + actor id.
 */
export function createWidgetsClient(options: CreateWidgetsClientOptions = {}) {
  const config = resolveConfig(options)

  return {
    kb: {
      articles: {
        list(
          actor: Actor,
          params: {
            host: KnowledgeWidgetHost
            max_audience?: KbArticleAudience
            category_id?: string
            featured?: boolean
            q?: string
            cursor?: string
            limit?: number
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: '/api/v1/kb/articles',
              query: {
                host: params.host,
                max_audience: params.max_audience,
                category_id: params.category_id,
                featured: params.featured ? 'true' : undefined,
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

        retrieve(
          actor: Actor,
          id: string,
          params: {
            host?: KnowledgeWidgetHost
            max_audience?: KbArticleAudience
          } = {}
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: `/api/v1/kb/articles/${encodeURIComponent(id)}`,
              query: {
                host: params.host,
                max_audience: params.max_audience,
              },
            },
            (data) => {
              const parsed = kbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticle>>
        },

        retrieveBySlug(
          actor: Actor,
          slug: string,
          params: {
            host: KnowledgeWidgetHost
            max_audience?: KbArticleAudience
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: `/api/v1/kb/articles/by-slug/${encodeURIComponent(slug)}`,
              query: {
                host: params.host,
                max_audience: params.max_audience,
              },
            },
            (data) => {
              const parsed = kbArticleSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbArticle>>
        },
      },

      categories: {
        list(actor: Actor, params: { host: KnowledgeWidgetHost }) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: '/api/v1/kb/categories',
              query: { host: params.host },
            },
            (data) => {
              const parsed = kbCategoryListSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbCategoryList>>
        },
      },

      bookmarks: {
        list(
          actor: Actor,
          params: {
            host: KnowledgeWidgetHost
            max_audience?: KbArticleAudience
          }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'GET',
              path: '/api/v1/kb/bookmarks',
              query: {
                host: params.host,
                max_audience: params.max_audience,
              },
            },
            (data) => {
              const parsed = kbBookmarkListSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbBookmarkList>>
        },

        create(
          actor: Actor,
          params: { article_id: string; host: KnowledgeWidgetHost }
        ) {
          return requestJson(
            config,
            actor,
            {
              method: 'POST',
              path: '/api/v1/kb/bookmarks',
              body: params,
            },
            (data) => {
              const parsed = kbBookmarkSchema.safeParse(data)
              return parsed.success ? parsed.data : null
            }
          ) as Promise<WidgetsClientResult<KbBookmark>>
        },

        delete(actor: Actor, articleId: string) {
          return requestJson(
            config,
            actor,
            {
              method: 'DELETE',
              path: `/api/v1/kb/bookmarks/${encodeURIComponent(articleId)}`,
            },
            (data) => data as { object: 'kb_bookmark'; deleted: true }
          ) as Promise<
            WidgetsClientResult<{ object: 'kb_bookmark'; deleted: true }>
          >
        },
      },
    },

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
