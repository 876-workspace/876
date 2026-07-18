/**
 * One-off, idempotent backfill: seed the owner of every core 876 organization
 * customer as that customer's default primary contact, snapshotting the owner's
 * name/email from the live identity API. Safe to re-run — existing owner
 * contacts are refreshed, unresolved orgs are skipped (never fabricated).
 *
 * Run from apps/billing:
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/backfill-owner-contacts.ts
 */
import { createBackgroundPlatformClient } from '@/lib/876/platform-client'
import { service } from '@/lib/service'

async function main() {
  const platform = createBackgroundPlatformClient()
  const result = await service.customers.backfillOrgOwnerContacts(platform)

  console.log(
    `[backfill-owner-contacts] created=${result.created} refreshed=${result.refreshed} skipped=${result.skipped}`
  )
  if (result.skipped > 0)
    console.warn(
      '[backfill-owner-contacts] some org customers could not be resolved against the identity API and were skipped (no contact fabricated).'
    )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[backfill-owner-contacts] failed', error)
    process.exit(1)
  })
