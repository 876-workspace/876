/**
 * Seed orchestration — the CLI entry composition.
 *
 * Nothing under `src/seeds/` may be imported by `src/app.ts` or `src/server.ts`.
 * The Express service must not run seeds or DDL at startup
 * (`.claude/rules/express-api.md`). Seeds are idempotent CLI operations;
 * the service boots without them and they are invoked explicitly via
 * `pnpm node:seed`.
 */

import { getLogger } from '@/platform/logger'

import { seedBootstrap } from './bootstrap'
import { seedGeoCatalog } from './geo'
import { seedAllFeatures } from './features'
import { seedFirstPartyProvisioningManifests } from './provisioning'
import { seedPlans } from './plans'

const log = getLogger('seeds:index')

export type RunSeedsOptions = {
  only?: string[]
}

export type RunSeedsSummary = {
  bootstrap: Awaited<ReturnType<typeof seedBootstrap>> | null
  geo: Awaited<ReturnType<typeof seedGeoCatalog>> | null
  provisioning: Awaited<
    ReturnType<typeof seedFirstPartyProvisioningManifests>
  > | null
  features: Awaited<ReturnType<typeof seedAllFeatures>> | null
  plans: Awaited<ReturnType<typeof seedPlans>> | null
}

/**
 * Run seeds in the order `main.py` runs them:
 *
 * 1. bootstrap — platform_apps (Efesto org + first-party apps)
 * 2. geo — geo_regions (countries + regions)
 * 3. provisioning — first_party_provisioning (manifests)
 * 4. features — feature_catalog (PostHog + local catalog)
 * 5. plans — platform_plan_modules + billing_plan_assignments
 */
export async function runSeeds(
  options: RunSeedsOptions = {}
): Promise<RunSeedsSummary> {
  const only = options.only ? new Set(options.only) : null
  const shouldRun = (name: string): boolean => !only || only.has(name)

  const summary: RunSeedsSummary = {
    bootstrap: null,
    geo: null,
    provisioning: null,
    features: null,
    plans: null,
  }

  if (shouldRun('bootstrap')) {
    log.info('seeds.bootstrap.started')
    summary.bootstrap = await seedBootstrap()
    log.info({ summary: summary.bootstrap }, 'seeds.bootstrap.completed')
  }

  if (shouldRun('geo')) {
    log.info('seeds.geo.started')
    summary.geo = await seedGeoCatalog()
    log.info({ summary: summary.geo }, 'seeds.geo.completed')
  }

  if (shouldRun('provisioning')) {
    log.info('seeds.provisioning.started')
    summary.provisioning = await seedFirstPartyProvisioningManifests()
    log.info({ summary: summary.provisioning }, 'seeds.provisioning.completed')
  }

  if (shouldRun('features')) {
    log.info('seeds.features.started')
    summary.features = await seedAllFeatures()
    log.info({ summary: summary.features }, 'seeds.features.completed')
  }

  if (shouldRun('plans')) {
    log.info('seeds.plans.started')
    summary.plans = await seedPlans()
    log.info({ summary: summary.plans }, 'seeds.plans.completed')
  }

  return summary
}
