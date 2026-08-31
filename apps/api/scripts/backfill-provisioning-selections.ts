import {
  backfillProvisioningSelections,
  type ProvisioningSelectionBackfillOptions,
} from '@/services/provisioning-selection-backfill'

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length) : null
}

function parsePositiveInteger(name: string): number | null {
  const raw = argumentValue(name)
  if (raw === null) return null
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive integer.`)
  }
  return value
}

async function main(): Promise<void> {
  if (hasFlag('help') || hasFlag('h')) {
    console.log(`Usage: pnpm --filter @876/api provisioning:backfill-selections [options]

Explicitly assigns a persisted provisioning setup to organizations created
before Phase 2. This command is never run by startup or pnpm seed.

Options:
  --dry-run          Resolve and report without writing organization rows.
  --page-size=<n>    Database page size, 1-500. Defaults to 100.
  --limit=<n>        Maximum organizations to examine in this invocation.
  --help, -h         Show this help.`)
    return
  }

  const pageSize = parsePositiveInteger('page-size')
  const limit = parsePositiveInteger('limit')
  const options: ProvisioningSelectionBackfillOptions = {
    dryRun: hasFlag('dry-run'),
    ...(pageSize !== null ? { pageSize } : {}),
    ...(limit !== null ? { maxOrganizations: limit } : {}),
  }

  const summary = await backfillProvisioningSelections(options)
  console.log(JSON.stringify(summary, null, 2))
}

try {
  await main()
} finally {
  if (!hasFlag('help') && !hasFlag('h')) {
    const { disconnectDb } = await import('@/db/client')
    await disconnectDb()
  }
}
