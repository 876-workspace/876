import { z } from 'zod'

export const widgetHostSchema = z.enum([
  'console',
  'billing',
  'couriers',
  'enterprise',
  '876',
])

export type KnowledgeWidgetHost = z.infer<typeof widgetHostSchema>

export const kbArticleStatusSchema = z.enum(['draft', 'published', 'archived'])
export type KbArticleStatus = z.infer<typeof kbArticleStatusSchema>

export const kbArticleAudienceSchema = z.enum([
  'end_user',
  'org_member',
  'platform_admin',
])
export type KbArticleAudience = z.infer<typeof kbArticleAudienceSchema>

export const kbCategorySchema = z.object({
  object: z.literal('kb_category'),
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  parent_id: z.string().nullable(),
  sort_order: z.number(),
  hosts: z.array(widgetHostSchema),
  created_at: z.number(),
  updated_at: z.number(),
})

export type KbCategory = z.infer<typeof kbCategorySchema>

export const kbArticleSchema = z.object({
  object: z.literal('kb_article'),
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string(),
  category_id: z.string().nullable(),
  status: kbArticleStatusSchema,
  audience: kbArticleAudienceSchema,
  hosts: z.array(widgetHostSchema),
  featured: z.boolean(),
  author_user_id: z.string(),
  published_at: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
})

export type KbArticle = z.infer<typeof kbArticleSchema>

/** Slim article card used in bookmark lists. */
export const kbArticleSummarySchema = z.object({
  object: z.literal('kb_article'),
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  category_id: z.string().nullable(),
  status: kbArticleStatusSchema,
  audience: kbArticleAudienceSchema,
  hosts: z.array(widgetHostSchema),
  featured: z.boolean(),
  updated_at: z.number(),
})

export type KbArticleSummary = z.infer<typeof kbArticleSummarySchema>

export const kbBookmarkSchema = z.object({
  object: z.literal('kb_bookmark'),
  id: z.string(),
  article_id: z.string(),
  owner_account_id: z.string(),
  created_at: z.number(),
  article: kbArticleSummarySchema.optional(),
})

export type KbBookmark = z.infer<typeof kbBookmarkSchema>

export const kbCategoryListSchema = z.object({
  object: z.literal('list'),
  data: z.array(kbCategorySchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
})

export type KbCategoryList = z.infer<typeof kbCategoryListSchema>

export const kbArticleListSchema = z.object({
  object: z.literal('list'),
  data: z.array(kbArticleSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
  continue_cursor: z.string().optional(),
})

export type KbArticleList = z.infer<typeof kbArticleListSchema>

export const kbBookmarkListSchema = z.object({
  object: z.literal('list'),
  data: z.array(kbBookmarkSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
})

export type KbBookmarkList = z.infer<typeof kbBookmarkListSchema>

export const deletedKbArticleSchema = z.object({
  object: z.literal('kb_article'),
  id: z.string(),
  deleted: z.literal(true),
})

export type DeletedKbArticle = z.infer<typeof deletedKbArticleSchema>

export const deletedKbCategorySchema = z.object({
  object: z.literal('kb_category'),
  id: z.string(),
  deleted: z.literal(true),
})

export type DeletedKbCategory = z.infer<typeof deletedKbCategorySchema>
