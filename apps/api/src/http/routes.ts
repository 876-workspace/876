import { Router } from 'express'

import { createAuthGuards, type AuthGuards } from '@/http/auth'
import { findApiKeyByHash, markApiKeyUsed } from '@/modules/apps'
import { geoRouter } from '@/modules/geo'
import { healthRouter } from '@/modules/health'

/**
 * Router composition. The only file in `http/` allowed to import a module —
 * this is the composition root where the service's surface is assembled, and
 * where the auth guards are given the credential lookup they cannot import
 * themselves.
 *
 * Mounting order mirrors api/v1.py:
 *
 *   - public routers first (health, OAuth, geo, webhooks) — each enforces its
 *     own credential rules, because an OIDC client or a Twilio webhook cannot
 *     present a first-party 876 API key;
 *   - then the protected modules, each built with the API-key guard.
 */
export function buildRoutes(): Router {
  const root = Router()

  root.use(healthRouter)
  // Geo reference data is public: a sign-up form needs the country and currency
  // lists before the visitor has any credential to present.
  root.use(geoRouter)

  // Protected modules are mounted here as they are migrated, each built with
  // `guards.requireApiKey` passed to its `createApiRouter({ guards })`.
  //
  // The guard is attached per route rather than with `router.use`, so it runs
  // only after a path matches — the same order FastAPI's router-level
  // dependency runs in. Mounting it as middleware would answer every unknown
  // path with 401 instead of 404.

  return root
}

/**
 * The auth guards, wired to the `apps` module's credential lookup.
 *
 * Exposed separately so a module router is built with exactly the tiers it
 * needs, and so a test can build the same guards over a stub lookup.
 */
export function buildAuthGuards(): AuthGuards {
  return createAuthGuards({ findApiKeyByHash, markApiKeyUsed })
}
