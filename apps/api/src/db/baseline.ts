/**
 * Decides what to do about the baseline migration on a given database.
 *
 * The identity database predates Prisma: the FastAPI service built it from
 * `ensure_*` functions, and `prisma/migrations/00000000000000_baseline` only
 * *describes* the result — it was generated from the live schema. Applying it
 * fails on its first statement (`relation "addresses" already exists`), which
 * is what broke the first deploy of the Express service.
 *
 * `prisma migrate resolve --applied` is the sanctioned fix, but it is a
 * per-environment one-off that nothing was doing. `scripts/baseline-database.ts`
 * does it before every deploy; this module is the decision it makes, kept pure
 * so it can be tested without a database — which matters, because the wrong
 * answer here either fails every deploy or permanently skips real tables.
 *
 * It also answers a question the first version did not ask: **is this even the
 * identity database?** The deploy ran identity DDL against the couriers
 * database for a day because a repository secret named `DATABASE_URL` held a
 * courier connection string, and the only thing that stopped the whole baseline
 * from being created there was the coincidence that both schemas have an
 * `addresses` table. Every table sampled below is therefore one that exists in
 * the identity schema and nowhere else on the platform, so "none of them are
 * here" is a reliable signal that the URL points somewhere it should not.
 */

/** The `_prisma_migrations` row for the baseline, when one exists. */
export type BaselineMigrationRow = {
  finishedAt: Date | null
  rolledBackAt: Date | null
}

export type BaselineDecision =
  /** Already applied — nothing to do. */
  | { action: 'skip'; reason: 'already-applied' }
  /** Empty database: let `migrate deploy` create the schema normally. */
  | { action: 'skip'; reason: 'empty-database' }
  /** Pre-Prisma database carrying the full schema: resolve the baseline. */
  | { action: 'resolve'; clearFailedRecord: boolean }
  /** Populated, but carrying none of the identity tables — the wrong database. */
  | { action: 'refuse'; reason: 'foreign-database'; missing: string[] }
  /** Neither empty nor complete — refuse rather than guess. */
  | { action: 'refuse'; reason: 'partial-schema'; missing: string[] }

export function decideBaselineAction(params: {
  /** Baseline tables actually present in the database. */
  presentTables: readonly string[]
  /** The sample of identity-only baseline tables that was looked for. */
  sampleTables: readonly string[]
  /** How many tables the `public` schema holds in total. */
  publicTableCount: number
  /** The baseline's `_prisma_migrations` row, or null when absent. */
  baselineRow: BaselineMigrationRow | null
}): BaselineDecision {
  const { presentTables, sampleTables, publicTableCount, baselineRow } = params

  const present = new Set(presentTables)
  const missing = sampleTables.filter((table) => !present.has(table))

  // Checked before anything else, including the already-applied shortcut: a
  // database holding tables but none of the identity ones is some other
  // service's, and nothing this script can conclude about it is worth acting
  // on. The identity database always trips at least one of these names, so this
  // can only fire on a misaimed connection string.
  if (missing.length === sampleTables.length && publicTableCount > 0) {
    return { action: 'refuse', reason: 'foreign-database', missing }
  }

  // A finished, non-rolled-back row is the only "already done" state. A row
  // that finished and was later rolled back must be resolved again.
  if (baselineRow?.finishedAt && !baselineRow.rolledBackAt) {
    return { action: 'skip', reason: 'already-applied' }
  }

  if (missing.length === sampleTables.length) {
    return { action: 'skip', reason: 'empty-database' }
  }

  // Some but not all: marking the baseline applied would permanently skip the
  // tables that are missing, and applying it would fail on the ones that exist.
  // Neither is recoverable automatically.
  if (missing.length > 0) {
    return { action: 'refuse', reason: 'partial-schema', missing }
  }

  // A row that started and neither finished nor rolled back is a failed apply;
  // Prisma requires it be rolled back before it can be resolved as applied.
  const clearFailedRecord = Boolean(
    baselineRow && !baselineRow.finishedAt && !baselineRow.rolledBackAt
  )

  return { action: 'resolve', clearFailedRecord }
}
