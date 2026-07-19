import type {
  DeletedKbArticle,
  DeletedKbCategory,
  KbArticle,
  KbArticleAudience,
  KbArticleList,
  KbArticleStatus,
  KbBookmark,
  KbBookmarkList,
  KbCategory,
  KbCategoryList,
  KnowledgeWidgetHost,
} from '../types/knowledge'

export type BrowserKbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; status?: number }

const MEMBER_BASE = '/api/widgets/knowledge-base'
const ADMIN_BASE = '/api/widgets/admin/knowledge-base'

async function hostRequest<T>(
  path: string,
  init?: RequestInit
): Promise<BrowserKbResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    const payload = (await response.json().catch(() => null)) as {
      data?: T
      error?: { message?: string } | string | null
    } | null

    if (!response.ok) {
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : (payload?.error?.message ?? `Request failed (${response.status}).`)
      return { data: null, error: message, status: response.status }
    }

    if (!payload || payload.data === undefined || payload.data === null)
      return { data: null, error: 'Invalid response from host.' }

    return { data: payload.data, error: null }
  } catch {
    return { data: null, error: 'Unable to reach the widget service.' }
  }
}

/** Browser client for host same-origin Knowledge Base routes. */
export const browserKnowledge = {
  articles: {
    list(
      params: {
        q?: string
        category_id?: string
        featured?: boolean
        cursor?: string
        limit?: number
      } = {}
    ) {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.category_id) query.set('category_id', params.category_id)
      if (params.featured) query.set('featured', 'true')
      if (params.cursor) query.set('cursor', params.cursor)
      if (params.limit) query.set('limit', String(params.limit))
      const suffix = query.size ? `?${query}` : ''
      return hostRequest<KbArticleList>(`${MEMBER_BASE}/articles${suffix}`)
    },

    retrieve(id: string) {
      return hostRequest<KbArticle>(
        `${MEMBER_BASE}/articles/${encodeURIComponent(id)}`
      )
    },
  },

  categories: {
    list() {
      return hostRequest<KbCategoryList>(`${MEMBER_BASE}/categories`)
    },
  },

  bookmarks: {
    list() {
      return hostRequest<KbBookmarkList>(`${MEMBER_BASE}/bookmarks`)
    },

    create(articleId: string) {
      return hostRequest<KbBookmark>(`${MEMBER_BASE}/bookmarks`, {
        method: 'POST',
        body: JSON.stringify({ article_id: articleId }),
      })
    },

    delete(articleId: string) {
      return hostRequest<{ object: 'kb_bookmark'; deleted: true }>(
        `${MEMBER_BASE}/bookmarks/${encodeURIComponent(articleId)}`,
        { method: 'DELETE' }
      )
    },
  },

  admin: {
    articles: {
      list(
        params: {
          status?: KbArticleStatus
          host?: KnowledgeWidgetHost
          audience?: KbArticleAudience
          q?: string
          cursor?: string
          limit?: number
        } = {}
      ) {
        const query = new URLSearchParams()
        if (params.status) query.set('status', params.status)
        if (params.host) query.set('host', params.host)
        if (params.audience) query.set('audience', params.audience)
        if (params.q) query.set('q', params.q)
        if (params.cursor) query.set('cursor', params.cursor)
        if (params.limit) query.set('limit', String(params.limit))
        const suffix = query.size ? `?${query}` : ''
        return hostRequest<KbArticleList>(`${ADMIN_BASE}/articles${suffix}`)
      },

      retrieve(id: string) {
        return hostRequest<KbArticle>(
          `${ADMIN_BASE}/articles/${encodeURIComponent(id)}`
        )
      },

      create(params: {
        slug: string
        title: string
        summary?: string
        body: string
        category_id?: string
        status?: KbArticleStatus
        audience?: KbArticleAudience
        hosts: KnowledgeWidgetHost[]
        featured?: boolean
      }) {
        return hostRequest<KbArticle>(`${ADMIN_BASE}/articles`, {
          method: 'POST',
          body: JSON.stringify(params),
        })
      },

      update(
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
        return hostRequest<KbArticle>(
          `${ADMIN_BASE}/articles/${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(params),
          }
        )
      },

      delete(id: string) {
        return hostRequest<DeletedKbArticle>(
          `${ADMIN_BASE}/articles/${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        )
      },
    },

    categories: {
      list(params: { host?: KnowledgeWidgetHost } = {}) {
        const query = new URLSearchParams()
        if (params.host) query.set('host', params.host)
        const suffix = query.size ? `?${query}` : ''
        return hostRequest<KbCategoryList>(`${ADMIN_BASE}/categories${suffix}`)
      },

      create(params: {
        slug: string
        name: string
        description?: string
        parent_id?: string
        sort_order?: number
        hosts: KnowledgeWidgetHost[]
      }) {
        return hostRequest<KbCategory>(`${ADMIN_BASE}/categories`, {
          method: 'POST',
          body: JSON.stringify(params),
        })
      },

      update(
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
        return hostRequest<KbCategory>(
          `${ADMIN_BASE}/categories/${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(params),
          }
        )
      },

      delete(id: string) {
        return hostRequest<DeletedKbCategory>(
          `${ADMIN_BASE}/categories/${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        )
      },
    },
  },
}
