import {
  kbFns,
  runKbMutation,
  runKbQuery,
  serviceAuth,
  type KbAudience,
  type KbHost,
} from '@/lib/kb/convex-client'
import type {
  DeletedKbArticle,
  KbArticleList,
  KbArticleResource,
  KbStatus,
} from './types'

export async function listArticlesForHost(params: {
  actorUserId: string
  host: KbHost
  maxAudience?: KbAudience
  categoryId?: string
  featuredOnly?: boolean
  q?: string
  cursor?: string
  numItems?: number
}) {
  const auth = serviceAuth(params.actorUserId)
  return runKbQuery<KbArticleList>('articles.listForHost', async (client) => {
    const page = await client.query(kbFns.articles.listForHost, {
      ...auth,
      host: params.host,
      maxAudience: params.maxAudience ?? 'org_member',
      categoryId: params.categoryId,
      featuredOnly: params.featuredOnly,
      q: params.q,
      paginationOpts: {
        numItems: params.numItems ?? 25,
        cursor: params.cursor ?? null,
      },
    })
    return {
      object: 'list',
      data: page.data ?? [],
      has_more: Boolean(page.has_more),
      url: '/v1/kb/articles',
      total_count: page.total_count ?? null,
      continue_cursor: page.continueCursor || undefined,
    }
  })
}

export async function listAllArticles(params: {
  actorUserId: string
  status?: KbStatus
  host?: KbHost
  audience?: KbAudience
  categoryId?: string
  q?: string
  cursor?: string
  numItems?: number
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbQuery<KbArticleList>('articles.listAll', async (client) => {
    const page = await client.query(kbFns.articles.listAll, {
      ...auth,
      isAdmin: true,
      status: params.status,
      host: params.host,
      audience: params.audience,
      categoryId: params.categoryId,
      q: params.q,
      paginationOpts: {
        numItems: params.numItems ?? 25,
        cursor: params.cursor ?? null,
      },
    })
    return {
      object: 'list',
      data: page.data ?? [],
      has_more: Boolean(page.has_more),
      url: '/v1/admin/kb/articles',
      total_count: page.total_count ?? null,
      continue_cursor: page.continueCursor || undefined,
    }
  })
}

export async function retrieveArticle(params: {
  actorUserId: string
  id: string
  host?: KbHost
  maxAudience?: KbAudience
  isAdmin?: boolean
}) {
  const auth = serviceAuth(params.actorUserId, params.isAdmin)
  return runKbQuery<KbArticleResource | null>(
    'articles.retrieve',
    async (client) =>
      client.query(kbFns.articles.retrieve, {
        ...auth,
        id: params.id,
        host: params.host,
        maxAudience: params.maxAudience,
        isAdmin: params.isAdmin,
      })
  )
}

export async function retrieveArticleBySlug(params: {
  actorUserId: string
  slug: string
  host: KbHost
  maxAudience?: KbAudience
  isAdmin?: boolean
}) {
  const auth = serviceAuth(params.actorUserId, params.isAdmin)
  return runKbQuery<KbArticleResource | null>(
    'articles.retrieveBySlug',
    async (client) =>
      client.query(kbFns.articles.retrieveBySlug, {
        ...auth,
        slug: params.slug,
        host: params.host,
        maxAudience: params.maxAudience ?? 'org_member',
        isAdmin: params.isAdmin,
      })
  )
}

export async function createArticle(params: {
  actorUserId: string
  slug: string
  title: string
  summary?: string
  body: string
  categoryId?: string
  status?: KbStatus
  audience?: KbAudience
  hosts: KbHost[]
  featured?: boolean
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<KbArticleResource>('articles.create', async (client) =>
    client.mutation(kbFns.articles.create, {
      ...auth,
      isAdmin: true,
      slug: params.slug,
      title: params.title,
      summary: params.summary,
      body: params.body,
      categoryId: params.categoryId,
      status: params.status,
      audience: params.audience,
      hosts: params.hosts,
      featured: params.featured,
    })
  )
}

export async function updateArticle(params: {
  actorUserId: string
  id: string
  slug?: string
  title?: string
  summary?: string | null
  body?: string
  categoryId?: string | null
  status?: KbStatus
  audience?: KbAudience
  hosts?: KbHost[]
  featured?: boolean
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<KbArticleResource>('articles.update', async (client) =>
    client.mutation(kbFns.articles.update, {
      ...auth,
      isAdmin: true,
      id: params.id,
      slug: params.slug,
      title: params.title,
      summary: params.summary,
      body: params.body,
      categoryId: params.categoryId,
      status: params.status,
      audience: params.audience,
      hosts: params.hosts,
      featured: params.featured,
    })
  )
}

export async function deleteArticle(params: {
  actorUserId: string
  id: string
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<DeletedKbArticle>('articles.remove', async (client) =>
    client.mutation(kbFns.articles.remove, {
      ...auth,
      isAdmin: true,
      id: params.id,
    })
  )
}
