import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Knowledge Base is the only domain stored in this Convex deployment.
 *
 * Notepad and other widget-native state live in Widgets Postgres (Prisma).
 * Do not re-add legacy tables (notes, notepad, etc.) here — if they still
 * exist in a deployment, run `internal.cleanup.wipeLegacyTables` then
 * Delete Table in the Convex dashboard.
 *
 * Latest Convex practices applied:
 * - Explicit schema + schemaValidation (default on)
 * - Indexes for every list/filter path (avoid unbounded .filter scans)
 * - Search index for article full-text
 * - Document IDs via v.id("table") for relations
 * - Literal unions for status/audience/host enums
 */

const widgetHost = v.union(
  v.literal('console'),
  v.literal('billing'),
  v.literal('couriers'),
  v.literal('enterprise'),
  v.literal('876')
)

const articleStatus = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('archived')
)

const articleAudience = v.union(
  v.literal('end_user'),
  v.literal('org_member'),
  v.literal('platform_admin')
)

export default defineSchema({
  kbCategories: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id('kbCategories')),
    sortOrder: v.number(),
    /** Hosts that may surface this category in the widget. */
    hosts: v.array(widgetHost),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_parent_sort', ['parentId', 'sortOrder'])
    .index('by_updated', ['updatedAt']),

  kbArticles: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    /** Editor.js OutputData JSON string. */
    body: v.string(),
    /** Denormalized plain text for search (title + body extraction on write). */
    plainText: v.string(),
    categoryId: v.optional(v.id('kbCategories')),
    status: articleStatus,
    audience: articleAudience,
    /** Many-to-many visibility: article appears in these host apps. */
    hosts: v.array(widgetHost),
    featured: v.boolean(),
    authorUserId: v.string(),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_status_updated', ['status', 'updatedAt'])
    .index('by_updated', ['updatedAt'])
    .index('by_category_status', ['categoryId', 'status'])
    .index('by_featured_updated', ['featured', 'updatedAt'])
    .searchIndex('search_plain', {
      searchField: 'plainText',
      filterFields: ['status', 'audience'],
    }),

  kbArticleBookmarks: defineTable({
    articleId: v.id('kbArticles'),
    ownerAccountId: v.string(),
    createdAt: v.number(),
  })
    .index('by_owner_created', ['ownerAccountId', 'createdAt'])
    .index('by_article_owner', ['articleId', 'ownerAccountId'])
    .index('by_article', ['articleId']),
})
