import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Wipe legacy tables that must not live in this Convex deployment.
 *
 * Current practice (Convex docs + dashboard):
 * 1. Delete all documents in batches (this mutation)
 * 2. Dashboard → Data → table ⋮ → "Delete table"
 * 3. Keep schema.ts listing ONLY knowledge-base tables
 *
 * Run from apps/widgets-api:
 *   npx convex run cleanup:wipeLegacyTable '{"table":"notes"}'
 *   npx convex run cleanup:wipeAllLegacyTables
 *
 * Never use unbounded .collect() — batch with take() + scheduler.
 */

export const LEGACY_TABLE_NAMES = [
  'notes',
  'notepad',
  'notepadNotes',
  'notepad_notes',
  'widgetNotes',
  'stickyNotes',
  'entries',
  'noteEntries',
  'tokens',
  'widgetTokens',
  'sessions',
  'widgetSessions',
] as const

const PROTECTED = new Set(['kbCategories', 'kbArticles', 'kbArticleBookmarks'])

const BATCH = 64

type LegacyDoc = { _id: string }

/** Untyped DB access for tables intentionally absent from schema.ts. */
type LegacyDb = {
  query: (table: string) => { take: (n: number) => Promise<LegacyDoc[]> }
  delete: (table: string, id: string) => Promise<void>
}

export const wipeLegacyTable = internalMutation({
  args: {
    table: v.string(),
    deleted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (PROTECTED.has(args.table))
      throw new Error(`Refusing to wipe knowledge-base table "${args.table}".`)

    const deleted = args.deleted ?? 0
    // Legacy tables are intentionally absent from schema.ts.
    const db = ctx.db as unknown as LegacyDb

    let page: LegacyDoc[]
    try {
      page = await db.query(args.table).take(BATCH)
    } catch {
      return {
        table: args.table,
        deleted,
        done: true,
        message: `Table "${args.table}" not found or empty — nothing to wipe.`,
      }
    }

    if (page.length === 0) {
      return {
        table: args.table,
        deleted,
        done: true,
        message: `Finished wiping "${args.table}" (${deleted} docs). Delete the empty table in the Convex dashboard if it still appears.`,
      }
    }

    let count = deleted
    for (const doc of page) {
      await db.delete(args.table, doc._id)
      count += 1
    }

    await ctx.scheduler.runAfter(0, internal.cleanup.wipeLegacyTable, {
      table: args.table,
      deleted: count,
    })

    return {
      table: args.table,
      deleted: count,
      done: false,
      message: `Deleted ${count} docs from "${args.table}" so far; continuing…`,
    }
  },
})

export const wipeAllLegacyTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of LEGACY_TABLE_NAMES) {
      await ctx.scheduler.runAfter(0, internal.cleanup.wipeLegacyTable, {
        table,
      })
    }
    return {
      queued: LEGACY_TABLE_NAMES.length,
      tables: LEGACY_TABLE_NAMES,
      message:
        'Queued wipe jobs for known legacy tables. After they finish, use Dashboard → Data → ⋮ → Delete table for each empty leftover.',
    }
  },
})
