/**
 * Seed orchestration — the CLI entry composition.
 *
 * Nothing under `src/seeds/` may be imported by `src/application.ts` or
 * `src/server.ts`.
 * The Express service must not run seeds or DDL at startup
 * (`.claude/rules/express-api.md`). Seeds are idempotent CLI operations;
 * the service boots without them and they are invoked explicitly via
 * `pnpm node:seed`.
 *
 * Provisioning configuration is intentionally absent. Production provisioning
 * profiles/manifests are operator-managed database configuration, not seed
 * ownership. New environments import the versioned provisioning handoff spec
 * explicitly during database bootstrap.
 */

import { getLogger } from '@/platform/logger'

import { seedAppAccess } from './app-access'
import { seedBootstrap } from './bootstrap'
import { seedDefaultAppPrices } from './default-prices'
import { seedAllFeatures } from './features'
import { seedFinancialDirectory } from './financial-directory'
import { seedGeoCatalog } from './geo'
import { seedInternalPlans } from './internal-plan'
import { seedPlans } from './plans'

const log = getLogger('seeds:index')

export type RunSeedsOptions = {
  only?: string[]
}

export type RunSeedsSummary = {
  bootstrap: Awaited<ReturnType<typeof seedBootstrap>> | null
  appAccess: Awaited<ReturnType<typeof seedAppAccess>> | null
  geo: Awaited<ReturnType<typeof seedGeoCatalog>> | null
  financialDirectory: Awaited<ReturnType<typeof seedFinancialDirectory>> | null
  features: Awaited<ReturnType<typeof seedAllFeatures>> | null
  plans: Awaited<ReturnType<typeof seedPlans>> | null
  internalPlan: Awaited<ReturnType<typeof seedInternalPlans>> | null
  defaultPrices: Awaited<ReturnType<typeof seedDefaultAppPrices>> | null
}

export async function runSeeds(
  options: RunSeedsOptions = {}
): Promise<RunSeedsSummary> {
  const only = options.only ? new Set(options.only) : null
  const shouldRun = (name: string): boolean => !only || only.has(name)

  const summary: RunSeedsSummary = {
    bootstrap: null,
    appAccess: null,
    geo: null,
    financialDirectory: null,
    features: null,
    plans: null,
    internalPlan: null,
    defaultPrices: null,
  }

  if (shouldRun('bootstrap')) {
    log.info('seeds.bootstrap.started')
    summary.bootstrap = await seedBootstrap()
    log.info({ summary: summary.bootstrap }, 'seeds.bootstrap.completed')
  }

  // App access follows bootstrap because the catalogs resolve stable first-party
  // app slugs to their opaque app ids. It is safe to rerun and never writes
  // organization-scoped roles.
  if (shouldRun('appAccess')) {
    log.info('seeds.app_access.started')
    summary.appAccess = await seedAppAccess()
    log.info({ summary: summary.appAccess }, 'seeds.app_access.completed')
  }

  if (shouldRun('geo')) {
    log.info('seeds.geo.started')
    summary.geo = await seedGeoCatalog()
    log.info({ summary: summary.geo }, 'seeds.geo.completed')
  }

  // Financial directory reference data depends on ISO countries from geo. The
  // seed itself also checks this dependency so --only=financialDirectory fails
  // clearly instead of creating orphaned reference data.
  if (shouldRun('financialDirectory')) {
    log.info('seeds.financial_directory.started')
    summary.financialDirectory = await seedFinancialDirectory()
    log.info(
      { summary: summary.financialDirectory },
      'seeds.financial_directory.completed'
    )
  }

  if (shouldRun('features')) {
    log.info('seeds.features.started')
    summary.features = await seedAllFeatures()
    log.info({ summary: summary.features }, 'seeds.features.completed')
  }

  // Default products must exist before first-time module grants are evaluated.
  // Plan seeding deliberately never restores an operator-removed grant, so
  // creating a product after its modules would make its initial grants
  // impossible to distinguish from a deliberate later removal.
  if (shouldRun('defaultPrices')) {
    log.info('seeds.default_prices.started')
    summary.defaultPrices = await seedDefaultAppPrices()
    log.info(
      { summary: summary.defaultPrices },
      'seeds.default_prices.completed'
    )
  }

  if (shouldRun('plans')) {
    log.info('seeds.plans.started')
    summary.plans = await seedPlans()
    log.info({ summary: summary.plans }, 'seeds.plans.completed')
  }

  // After plans: the internal plan grants every module the platform module seed
  // has just created, so it must not run first or it grants an empty set.
  if (shouldRun('internalPlan')) {
    log.info('seeds.internal_plan.started')
    summary.internalPlan = await seedInternalPlans()
    log.info({ summary: summary.internalPlan }, 'seeds.internal_plan.completed')
  }

  return summary
}
