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
 * per-environment one-off that nothing was doing. `scripts/baseline-database.mjs`
 * does it before every deploy; this module is the decision it makes, kept pure
 * so it can be tested without a database — which matters, because the wrong
 * answer here either fails every deploy or permanently skips real tables.
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
  /** Neither empty nor complete — refuse rather than guess. */
  | { action: 'refuse'; missing: string[] }

export function decideBaselineAction(params: {
  /** Baseline tables actually present in the database. */
  presentTables: readonly string[]
  /** The sample of baseline tables that was looked for. */
  sampleTables: readonly string[]
  /** The baseline's `_prisma_migrations` row, or null when absent. */
  baselineRow: BaselineMigrationRow | null
}): BaselineDecision {
  const { presentTables, sampleTables, baselineRow } = params

  // A finished, non-rolled-back row is the only "already done" state. A row
  // that finished and was later rolled back must be resolved again.
  if (baselineRow?.finishedAt && !baselineRow.rolledBackAt) {
    return { action: 'skip', reason: 'already-applied' }
  }

  const present = new Set(presentTables)
  const missing = sampleTables.filter((table) => !present.has(table))

  if (missing.length === sampleTables.length) {
    return { action: 'skip', reason: 'empty-database' }
  }

  // Some but not all: marking the baseline applied would permanently skip the
  // tables that are missing, and applying it would fail on the ones that exist.
  // Neither is recoverable automatically.
  if (missing.length > 0) return { action: 'refuse', missing }

  // A row that started and neither finished nor rolled back is a failed apply;
  // Prisma requires it be rolled back before it can be resolved as applied.
  const clearFailedRecord = Boolean(
    baselineRow && !baselineRow.finishedAt && !baselineRow.rolledBackAt
  )

  return { action: 'resolve', clearFailedRecord }
}
