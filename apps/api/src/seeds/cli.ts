import { getLogger } from '@/platform/logger'

import { runSeeds } from './index'

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

  if (help) {
    console.log(`Usage: pnpm node:seed [--only=bootstrap,geo,provisioning,features,plans]

Seeds the platform database idempotently. Each seed only creates absent rows
and never clobbers operator-changed values. Re-running is safe.

Options:
  --only=<names>  Run only the named seeds (comma-separated).
  --help, -h      Show this help.`)
    process.exit(0)
  }

  const valid = new Set([
    'bootstrap',
    'geo',
    'provisioning',
    'features',
    'plans',
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
    const summary = await runSeeds({ only })
    log.info({ summary }, 'seeds.cli.completed')
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    log.error({ err: error }, 'seeds.cli.failed')
    console.error(error)
    process.exit(1)
  } finally {
    // Disconnect Prisma to allow process to exit.
    try {
      const { disconnectDb } = await import('@/db/client')
      await disconnectDb()
    } catch {
      // Ignore disconnect errors.
    }
  }
}

void main()
