import { backfillAppAssignmentRoles } from '@/modules/app-access'
import { disconnectDb } from '@/db/lifecycle'

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`)
}

async function main(): Promise<void> {
  if (hasFlag('help')) {
    console.log(
      'Usage: pnpm --filter @876/api app-access:backfill-roles [--apply]'
    )
    return
  }

  const apply = hasFlag('apply')
  const report = await backfillAppAssignmentRoles(apply)

  console.log(JSON.stringify(report, null, 2))
}

try {
  await main()
} finally {
  await disconnectDb()
}
