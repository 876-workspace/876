/**
 * One-off, idempotent backfill for core 876 organization customers. For each
 * one it refreshes the party snapshot (company name, trading name, AP email,
 * phone) and seeds the org's owner as the default primary contact, reading
 * both from the live identity API.
 *
 * Safe to re-run: existing owner contacts are refreshed rather than
 * duplicated, a hand-added primary contact is demoted rather than deleted, and
 * an org that cannot be resolved is skipped (a contact is never fabricated).
 *
 * Run from apps/billing:
 *   node --env-file=.env ./node_modules/.bin/tsx scripts/backfill-owner-contacts.ts
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
