import { getLogger } from '@/platform/logger'

import {
  auditFinancialDirectoryCatalog,
  loadFinancialDirectoryCatalog,
} from './financial-directory'

const log = getLogger('seeds:cli')

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const onlyArg = args.find((arg) => arg.startsWith('--only='))
  const only = onlyArg
    ? onlyArg
        .replace('--only=', '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined
  const help = args.includes('--help') || args.includes('-h')
  const report = args.includes('--report')

  if (help) {
    console.log(`Usage: pnpm node:seed [--only=bootstrap,appAccess,geo,financialDirectory,features,plans,internalPlan,defaultPrices] [--report]

Seeds platform-owned catalogs/bootstrap records idempotently. Provisioning
profiles/manifests are intentionally excluded: they are database configuration
initialized through an explicit environment import, not ordinary seed ownership.

The financialDirectory seed loads versioned country-aware bank, branch and
credit-union reference data. Routing identity does not require a physical
location; trusted structured/geocoded branch addresses can be enriched
independently and the seed never invents coordinates.

Options:
  --only=<names>  Run only the named seeds (comma-separated).
  --report        Print the financial-directory catalog completeness audit
                  (reviewed snapshot gaps) without touching the database.
  --help, -h      Show this help.`)
    process.exit(0)
  }

  if (report) {
    const catalog = loadFinancialDirectoryCatalog()
    console.log(
      JSON.stringify(auditFinancialDirectoryCatalog(catalog), null, 2)
    )
    process.exit(0)
  }

  const valid = new Set([
    'bootstrap',
    'appAccess',
    'geo',
    'financialDirectory',
    'features',
    'plans',
    'internalPlan',
    'defaultPrices',
  ])
  if (only && only.some((name) => !valid.has(name))) {
    console.error(
      `Unknown seed names: ${only.filter((name) => !valid.has(name)).join(', ')}`
    )
    console.error(`Valid seeds: ${[...valid].join(', ')}`)
    process.exit(1)
  }

  log.info({ only }, 'seeds.cli.started')
  try {
    const { runSeeds } = await import('./index')
    const summary = await runSeeds({ only })
    log.info({ summary }, 'seeds.cli.completed')
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    log.error({ err: error }, 'seeds.cli.failed')
    console.error(error)
    process.exit(1)
  } finally {
    try {
      const { disconnectDb } = await import('@/db/client')
      await disconnectDb()
    } catch {
      // Ignore disconnect errors.
    }
  }
}

void main()
