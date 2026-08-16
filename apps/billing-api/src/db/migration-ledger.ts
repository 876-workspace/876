export type MigrationRow = {
  migrationName: string
  finished: boolean
  rolledBack: boolean
}

export type LedgerDecision =
  | { action: 'skip' }
  | { action: 'repair'; remove: string[]; resolve: string[] }
  | { action: 'refuse'; reason: string }

export const billingTableSample = [
  'billing_tenants',
  'billing_customers',
  'billing_invoices',
  'billing_subscriptions',
  'billing_vendors',
] as const

/**
 * Migration rows copied into the Billing database before schema ownership was
 * separated from the identity API. They describe no Billing DDL and the
 * corresponding identity tables are absent from this database.
 */
export const foreignMigrationRows = [
  '00000000000000_baseline',
  '20260523120000_add_user_username',
  '20260525120000_add_organizations_memberships',
  '20260525130000_add_user_account_type',
  '20260525140000_rename_avatar_column',
  '20260525150000_add_oauth_consents',
  '20260527120000_add_features',
  '20260527130000_use_unix_timestamp_bigints',
  '20260528120000_add_query_indexes',
  '20260528140000_add_feature_scope_and_org_features',
  '20260709210000_initial_foundation',
  '20260806000001_create_communication_calls',
  '20260807000001_add_communication_message_idempotency_scope',
] as const

export function decideLedgerRepair(options: {
  localMigrations: readonly string[]
  databaseMigrations: readonly MigrationRow[]
  presentSampleTables: readonly string[]
  publicTableCount: number
}): LedgerDecision {
  const present = new Set(options.presentSampleTables)
  const missingTables = billingTableSample.filter(
    (table) => !present.has(table)
  )
  if (missingTables.length || options.publicTableCount < 70) {
    return {
      action: 'refuse',
      reason: `database is not the complete Billing schema (missing: ${missingTables.join(', ') || 'table-count invariant'})`,
    }
  }

  const local = new Set(options.localMigrations)
  const allowedForeign = new Set<string>(foreignMigrationRows)
  const foreign = options.databaseMigrations.filter(
    (row) => !local.has(row.migrationName)
  )
  const unexpected = foreign.filter(
    (row) => !allowedForeign.has(row.migrationName)
  )
  if (unexpected.length) {
    return {
      action: 'refuse',
      reason: `unexpected database migrations: ${unexpected.map((row) => row.migrationName).join(', ')}`,
    }
  }
  const inProgress = foreign.filter((row) => !row.finished && !row.rolledBack)
  if (inProgress.length) {
    return {
      action: 'refuse',
      reason: `foreign migrations still in progress: ${inProgress.map((row) => row.migrationName).join(', ')}`,
    }
  }

  const applied = new Set(
    options.databaseMigrations
      .filter((row) => row.finished && !row.rolledBack)
      .map((row) => row.migrationName)
  )
  const missingLocal = options.localMigrations.filter(
    (name) => !applied.has(name)
  )
  const resolvable = new Set(['20260722000200_adopt_vendor_table'])
  const unresolvable = missingLocal.filter((name) => !resolvable.has(name))
  if (unresolvable.length) {
    return {
      action: 'refuse',
      reason: `unapplied Billing migrations require DDL: ${unresolvable.join(', ')}`,
    }
  }

  const remove = foreign.map((row) => row.migrationName).sort()
  const resolve = missingLocal.sort()
  return remove.length || resolve.length
    ? { action: 'repair', remove, resolve }
    : { action: 'skip' }
}
