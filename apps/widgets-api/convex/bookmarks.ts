import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  articleAudienceValidator,
  audiencesUpTo,
  hostsInclude,
  widgetHostValidator,
  type ArticleAudience,
  type WidgetHost,
} from './lib/hosts'
import { assertServiceSecret, unixSeconds } from './lib/auth'

const serviceArgs = {
  serviceKey: v.string(),
  actorUserId: v.string(),
}

export const list = query({
  args: {
    ...serviceArgs,
    host: widgetHostValidator,
    maxAudience: articleAudienceValidator,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    const allowed = new Set(audiencesUpTo(args.maxAudience as ArticleAudience))
    const host = args.host as WidgetHost

    const bookmarks = await ctx.db
      .query('kbArticleBookmarks')
      .withIndex('by_owner_created', (q) =>
        q.eq('ownerAccountId', args.actorUserId)
      )
      .order('desc')
      .take(100)

    const articles = []
    for (const bm of bookmarks) {
      const article = await ctx.db.get(bm.articleId)
      if (!article) continue
      if (article.status !== 'published') continue
      if (!hostsInclude(article.hosts, host)) continue
      if (!allowed.has(article.audience as ArticleAudience)) continue
      articles.push({
        object: 'kb_bookmark' as const,
        id: bm._id,
        article_id: bm.articleId,
        owner_account_id: bm.ownerAccountId,
        created_at: bm.createdAt,
        article: {
          object: 'kb_article' as const,
          id: article._id,
          slug: article.slug,
          title: article.title,
          summary: article.summary ?? null,
          category_id: article.categoryId ?? null,
          status: article.status,
          audience: article.audience,
          hosts: article.hosts,
          featured: article.featured,
          updated_at: article.updatedAt,
        },
      })
    }

    return {
      object: 'list' as const,
      data: articles,
      has_more: false,
      url: '/v1/kb/bookmarks',
      total_count: articles.length,
    }
  },
})

export const create = mutation({
  args: {
    ...serviceArgs,
    articleId: v.id('kbArticles'),
    host: widgetHostValidator,
    maxAudience: articleAudienceValidator,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)

    const article = await ctx.db.get(args.articleId)
    if (!article || article.status !== 'published')
      throw new Error('Article not found.')
    if (!hostsInclude(article.hosts, args.host as WidgetHost))
      throw new Error('Article not available on this host.')
    const allowed = new Set(audiencesUpTo(args.maxAudience as ArticleAudience))
    if (!allowed.has(article.audience as ArticleAudience))
      throw new Error('Article not available for this audience.')

    const existing = await ctx.db
      .query('kbArticleBookmarks')
      .withIndex('by_article_owner', (q) =>
        q.eq('articleId', args.articleId).eq('ownerAccountId', args.actorUserId)
      )
      .unique()
    if (existing) {
      return {
        object: 'kb_bookmark' as const,
        id: existing._id,
        article_id: existing.articleId,
        owner_account_id: existing.ownerAccountId,
        created_at: existing.createdAt,
      }
    }

    const now = unixSeconds()
    const id = await ctx.db.insert('kbArticleBookmarks', {
      articleId: args.articleId,
      ownerAccountId: args.actorUserId,
      createdAt: now,
    })
    return {
      object: 'kb_bookmark' as const,
      id,
      article_id: args.articleId,
      owner_account_id: args.actorUserId,
      created_at: now,
    }
  },
})

export const remove = mutation({
  args: {
    ...serviceArgs,
    articleId: v.id('kbArticles'),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)

    const existing = await ctx.db
      .query('kbArticleBookmarks')
      .withIndex('by_article_owner', (q) =>
        q.eq('articleId', args.articleId).eq('ownerAccountId', args.actorUserId)
      )
      .unique()

    if (!existing)
      return {
        object: 'kb_bookmark' as const,
        id: null,
        article_id: args.articleId,
        deleted: true as const,
      }

    await ctx.db.delete('kbArticleBookmarks', existing._id)
    return {
      object: 'kb_bookmark' as const,
      id: existing._id,
      article_id: args.articleId,
      deleted: true as const,
    }
  },
})
