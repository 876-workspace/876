import { mutation, query } from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import {
  ARTICLE_AUDIENCES,
  articleAudienceValidator,
  articleStatusValidator,
  audiencesUpTo,
  hostsInclude,
  widgetHostValidator,
  type ArticleAudience,
  type WidgetHost,
} from './lib/hosts'
import { assertServiceSecret, unixSeconds } from './lib/auth'
import { extractPlainText } from './lib/plainText'
import type { Doc, Id } from './_generated/dataModel'

const serviceArgs = {
  serviceKey: v.string(),
  actorUserId: v.string(),
}

const MAX_TITLE = 200
const MAX_BODY = 500_000
const MAX_SUMMARY = 500

export const listForHost = query({
  args: {
    ...serviceArgs,
    host: widgetHostValidator,
    maxAudience: articleAudienceValidator,
    categoryId: v.optional(v.id('kbCategories')),
    featuredOnly: v.optional(v.boolean()),
    q: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    const allowed = new Set(audiencesUpTo(args.maxAudience as ArticleAudience))
    const host = args.host as WidgetHost
    const q = args.q?.trim()

    if (q) {
      const results = await ctx.db
        .query('kbArticles')
        .withSearchIndex('search_plain', (search) =>
          search.search('plainText', q).eq('status', 'published')
        )
        .take(50)

      const data = results
        .filter(
          (row) =>
            hostsInclude(row.hosts, host) &&
            allowed.has(row.audience as ArticleAudience) &&
            (!args.categoryId || row.categoryId === args.categoryId) &&
            (!args.featuredOnly || row.featured)
        )
        .map(serializeArticle)

      return {
        object: 'list' as const,
        data,
        has_more: false,
        url: '/v1/kb/articles',
        total_count: data.length,
        continueCursor: '',
        isDone: true,
      }
    }

    const page = await ctx.db
      .query('kbArticles')
      .withIndex('by_status_updated', (idx) => idx.eq('status', 'published'))
      .order('desc')
      .paginate(args.paginationOpts)

    const data = page.page
      .filter(
        (row) =>
          hostsInclude(row.hosts, host) &&
          allowed.has(row.audience as ArticleAudience) &&
          (!args.categoryId || row.categoryId === args.categoryId) &&
          (!args.featuredOnly || row.featured)
      )
      .map(serializeArticle)

    return {
      object: 'list' as const,
      data,
      has_more: !page.isDone,
      url: '/v1/kb/articles',
      total_count: null as number | null,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    }
  },
})

export const listAll = query({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    status: v.optional(articleStatusValidator),
    host: v.optional(widgetHostValidator),
    audience: v.optional(articleAudienceValidator),
    categoryId: v.optional(v.id('kbCategories')),
    q: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const q = args.q?.trim()
    if (q) {
      const results = await ctx.db
        .query('kbArticles')
        .withSearchIndex('search_plain', (search) => {
          let s = search.search('plainText', q)
          if (args.status) s = s.eq('status', args.status)
          if (args.audience) s = s.eq('audience', args.audience)
          return s
        })
        .take(50)

      const data = results
        .filter(
          (row) =>
            (!args.host || hostsInclude(row.hosts, args.host as WidgetHost)) &&
            (!args.categoryId || row.categoryId === args.categoryId)
        )
        .map(serializeArticle)

      return {
        object: 'list' as const,
        data,
        has_more: false,
        url: '/v1/admin/kb/articles',
        total_count: data.length,
        continueCursor: '',
        isDone: true,
      }
    }

    const status = args.status
    const page = status
      ? await ctx.db
          .query('kbArticles')
          .withIndex('by_status_updated', (idx) => idx.eq('status', status))
          .order('desc')
          .paginate(args.paginationOpts)
      : await ctx.db
          .query('kbArticles')
          .withIndex('by_updated')
          .order('desc')
          .paginate(args.paginationOpts)

    const data = page.page
      .filter(
        (row) =>
          (!args.host || hostsInclude(row.hosts, args.host as WidgetHost)) &&
          (!args.audience || row.audience === args.audience) &&
          (!args.categoryId || row.categoryId === args.categoryId)
      )
      .map(serializeArticle)

    return {
      object: 'list' as const,
      data,
      has_more: !page.isDone,
      url: '/v1/admin/kb/articles',
      total_count: null as number | null,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    }
  },
})

export const retrieve = query({
  args: {
    ...serviceArgs,
    id: v.id('kbArticles'),
    host: v.optional(widgetHostValidator),
    maxAudience: v.optional(articleAudienceValidator),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    const row = await ctx.db.get(args.id)
    if (!row) return null

    if (args.isAdmin) return serializeArticle(row)

    if (row.status !== 'published') return null
    if (args.host && !hostsInclude(row.hosts, args.host as WidgetHost))
      return null
    if (args.maxAudience) {
      const allowed = new Set(
        audiencesUpTo(args.maxAudience as ArticleAudience)
      )
      if (!allowed.has(row.audience as ArticleAudience)) return null
    }
    return serializeArticle(row)
  },
})

export const retrieveBySlug = query({
  args: {
    ...serviceArgs,
    slug: v.string(),
    host: widgetHostValidator,
    maxAudience: articleAudienceValidator,
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    const row = await ctx.db
      .query('kbArticles')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug.trim().toLowerCase()))
      .unique()
    if (!row) return null

    if (args.isAdmin) return serializeArticle(row)
    if (row.status !== 'published') return null
    if (!hostsInclude(row.hosts, args.host as WidgetHost)) return null
    const allowed = new Set(audiencesUpTo(args.maxAudience as ArticleAudience))
    if (!allowed.has(row.audience as ArticleAudience)) return null
    return serializeArticle(row)
  },
})

export const create = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    slug: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.string(),
    categoryId: v.optional(v.id('kbCategories')),
    status: v.optional(articleStatusValidator),
    audience: v.optional(articleAudienceValidator),
    hosts: v.array(widgetHostValidator),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const title = args.title.trim()
    const slug = args.slug.trim().toLowerCase()
    validateArticleFields({
      title,
      slug,
      body: args.body,
      summary: args.summary,
      hosts: args.hosts,
    })

    const clash = await ctx.db
      .query('kbArticles')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (clash) throw new Error('Article slug already exists.')

    if (args.categoryId) {
      const cat = await ctx.db.get(args.categoryId)
      if (!cat) throw new Error('Category not found.')
    }

    const status = args.status ?? 'draft'
    const now = unixSeconds()
    const id = await ctx.db.insert('kbArticles', {
      slug,
      title,
      summary: args.summary?.trim() || undefined,
      body: args.body,
      plainText: extractPlainText(title, args.body),
      categoryId: args.categoryId,
      status,
      audience: args.audience ?? 'org_member',
      hosts: args.hosts,
      featured: args.featured ?? false,
      authorUserId: args.actorUserId,
      publishedAt: status === 'published' ? now : undefined,
      updatedAt: now,
    })
    const row = await ctx.db.get(id)
    if (!row) throw new Error('Failed to create article.')
    return serializeArticle(row)
  },
})

export const update = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    id: v.id('kbArticles'),
    slug: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.string()),
    categoryId: v.optional(v.union(v.id('kbCategories'), v.null())),
    status: v.optional(articleStatusValidator),
    audience: v.optional(articleAudienceValidator),
    hosts: v.optional(v.array(widgetHostValidator)),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Article not found.')

    const title = args.title?.trim() ?? existing.title
    const slug = args.slug?.trim().toLowerCase() ?? existing.slug
    const body = args.body ?? existing.body
    const hosts = args.hosts ?? existing.hosts

    validateArticleFields({
      title,
      slug,
      body,
      summary:
        args.summary === null ? undefined : (args.summary ?? existing.summary),
      hosts,
    })

    if (slug !== existing.slug) {
      const clash = await ctx.db
        .query('kbArticles')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique()
      if (clash) throw new Error('Article slug already exists.')
    }

    if (args.categoryId) {
      const cat = await ctx.db.get(args.categoryId)
      if (!cat) throw new Error('Category not found.')
    }

    const status = args.status ?? existing.status
    const now = unixSeconds()
    let publishedAt = existing.publishedAt
    if (status === 'published' && existing.status !== 'published')
      publishedAt = now
    if (status !== 'published') publishedAt = existing.publishedAt

    await ctx.db.patch(args.id, {
      slug,
      title,
      body,
      plainText: extractPlainText(title, body),
      ...(args.summary !== undefined
        ? {
            summary:
              args.summary === null
                ? undefined
                : args.summary.trim() || undefined,
          }
        : {}),
      ...(args.categoryId !== undefined
        ? {
            categoryId: args.categoryId === null ? undefined : args.categoryId,
          }
        : {}),
      status,
      ...(args.audience !== undefined ? { audience: args.audience } : {}),
      hosts,
      ...(args.featured !== undefined ? { featured: args.featured } : {}),
      publishedAt,
      updatedAt: now,
    })

    const row = await ctx.db.get(args.id)
    if (!row) throw new Error('Article not found after update.')
    return serializeArticle(row)
  },
})

export const remove = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    id: v.id('kbArticles'),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Article not found.')

    // Cascade bookmarks in batches (transaction-safe loop for modest counts).
    const bookmarks = await ctx.db
      .query('kbArticleBookmarks')
      .withIndex('by_article', (q) => q.eq('articleId', args.id))
      .take(200)
    for (const bm of bookmarks)
      await ctx.db.delete('kbArticleBookmarks', bm._id)

    await ctx.db.delete('kbArticles', args.id)
    return {
      object: 'kb_article' as const,
      id: args.id,
      deleted: true as const,
    }
  },
})

function validateArticleFields(params: {
  title: string
  slug: string
  body: string
  summary?: string
  hosts: readonly string[]
}) {
  if (!params.title || params.title.length > MAX_TITLE)
    throw new Error(`Title must be 1–${MAX_TITLE} characters.`)
  if (!params.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.slug))
    throw new Error('Slug must be lowercase kebab-case.')
  if (params.body.length > MAX_BODY)
    throw new Error(`Body exceeds ${MAX_BODY} characters.`)
  if (params.summary && params.summary.length > MAX_SUMMARY)
    throw new Error(`Summary must be at most ${MAX_SUMMARY} characters.`)
  if (params.hosts.length === 0)
    throw new Error('At least one host is required.')
}

function serializeArticle(row: Doc<'kbArticles'>) {
  return {
    object: 'kb_article' as const,
    id: row._id as Id<'kbArticles'>,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? null,
    body: row.body,
    category_id: row.categoryId ?? null,
    status: row.status,
    audience: row.audience,
    hosts: row.hosts,
    featured: row.featured,
    author_user_id: row.authorUserId,
    published_at: row.publishedAt ?? null,
    created_at: Math.floor(row._creationTime / 1000),
    updated_at: row.updatedAt,
  }
}

// Keep audience enum referenced so tree-shaking doesn't drop usage docs.
void ARTICLE_AUDIENCES
