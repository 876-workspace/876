import { Router } from 'express'

import { healthRouter } from '@/modules/health'

/**
 * Router composition. The only file in `http/` allowed to import a module —
 * this is the composition root where the service's surface is assembled.
 *
 * Mounting order mirrors api/v1.py:
 *
 *   - public routers first (health, OAuth, geo, webhooks) — each enforces its
 *     own credential rules, because an OIDC client or a Twilio webhook cannot
 *     present a first-party 876 API key;
 *   - then the protected router, behind requireApiKey.
 */
export function buildRoutes(): Router {
  const root = Router()

  root.use(healthRouter)

  // Protected surface. Modules are mounted here as they are migrated; the
  // requireApiKey guard is attached in Phase 3.
  const protectedRouter = Router()
  root.use(protectedRouter)

  return root
}
