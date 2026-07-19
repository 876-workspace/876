import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  articleAudienceValidator,
  hostsInclude,
  widgetHostValidator,
  type WidgetHost,
} from './lib/hosts'
import { assertServiceSecret, unixSeconds } from './lib/auth'

const serviceArgs = {
  serviceKey: v.string(),
  actorUserId: v.string(),
}

export const listForHost = query({
  args: {
    ...serviceArgs,
    host: widgetHostValidator,
    maxAudience: articleAudienceValidator,
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    // Bounded read — categories are expected to stay small; hard cap.
    const rows = await ctx.db.query('kbCategories').take(500)
    return rows
      .filter((row) => hostsInclude(row.hosts, args.host as WidgetHost))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(serializeCategory)
  },
})

export const listAll = query({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    host: v.optional(widgetHostValidator),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')
    const rows = await ctx.db.query('kbCategories').take(500)
    const filtered = args.host
      ? rows.filter((row) => hostsInclude(row.hosts, args.host as WidgetHost))
      : rows
    return filtered
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(serializeCategory)
  },
})

export const create = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id('kbCategories')),
    sortOrder: v.optional(v.number()),
    hosts: v.array(widgetHostValidator),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const slug = args.slug.trim().toLowerCase()
    const name = args.name.trim()
    if (!slug || !name) throw new Error('Slug and name are required.')
    if (args.hosts.length === 0)
      throw new Error('At least one host is required.')

    const existing = await ctx.db
      .query('kbCategories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (existing) throw new Error('Category slug already exists.')

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId)
      if (!parent) throw new Error('Parent category not found.')
    }

    const now = unixSeconds()
    const id = await ctx.db.insert('kbCategories', {
      slug,
      name,
      description: args.description?.trim() || undefined,
      parentId: args.parentId,
      sortOrder: args.sortOrder ?? 0,
      hosts: args.hosts,
      updatedAt: now,
    })
    const row = await ctx.db.get(id)
    if (!row) throw new Error('Failed to create category.')
    return serializeCategory(row)
  },
})

export const update = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    id: v.id('kbCategories'),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    parentId: v.optional(v.union(v.id('kbCategories'), v.null())),
    sortOrder: v.optional(v.number()),
    hosts: v.optional(v.array(widgetHostValidator)),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Category not found.')

    if (args.slug !== undefined) {
      const slug = args.slug.trim().toLowerCase()
      if (!slug) throw new Error('Slug is required.')
      const clash = await ctx.db
        .query('kbCategories')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique()
      if (clash && clash._id !== args.id)
        throw new Error('Category slug already exists.')
    }

    if (args.hosts !== undefined && args.hosts.length === 0)
      throw new Error('At least one host is required.')

    if (args.parentId) {
      if (args.parentId === args.id)
        throw new Error('Category cannot be its own parent.')
      const parent = await ctx.db.get(args.parentId)
      if (!parent) throw new Error('Parent category not found.')
    }

    await ctx.db.patch(args.id, {
      ...(args.slug !== undefined
        ? { slug: args.slug.trim().toLowerCase() }
        : {}),
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.description !== undefined
        ? {
            description:
              args.description === null
                ? undefined
                : args.description.trim() || undefined,
          }
        : {}),
      ...(args.parentId !== undefined
        ? { parentId: args.parentId === null ? undefined : args.parentId }
        : {}),
      ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
      ...(args.hosts !== undefined ? { hosts: args.hosts } : {}),
      updatedAt: unixSeconds(),
    })

    const row = await ctx.db.get(args.id)
    if (!row) throw new Error('Category not found after update.')
    return serializeCategory(row)
  },
})

export const remove = mutation({
  args: {
    ...serviceArgs,
    isAdmin: v.boolean(),
    id: v.id('kbCategories'),
  },
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceKey)
    if (!args.isAdmin) throw new Error('Admin access required.')

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Category not found.')

    const children = await ctx.db
      .query('kbCategories')
      .withIndex('by_parent_sort', (q) => q.eq('parentId', args.id))
      .take(1)
    if (children.length > 0)
      throw new Error('Remove or reparent child categories first.')

    const articles = await ctx.db
      .query('kbArticles')
      .withIndex('by_category_status', (q) => q.eq('categoryId', args.id))
      .take(1)
    if (articles.length > 0)
      throw new Error('Move or delete articles in this category first.')

    await ctx.db.delete('kbCategories', args.id)
    return {
      object: 'kb_category' as const,
      id: args.id,
      deleted: true as const,
    }
  },
})

function serializeCategory(row: {
  _id: string
  slug: string
  name: string
  description?: string
  parentId?: string
  sortOrder: number
  hosts: string[]
  updatedAt: number
  _creationTime: number
}) {
  return {
    object: 'kb_category' as const,
    id: row._id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    parent_id: row.parentId ?? null,
    sort_order: row.sortOrder,
    hosts: row.hosts,
    created_at: Math.floor(row._creationTime / 1000),
    updated_at: row.updatedAt,
  }
}
