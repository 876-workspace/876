import { Router } from 'express'

import type { GuardResolver } from '@/http/api-router'
import { createAuthGuards, type AuthGuards } from '@/http/auth'
import { createAddressesRouter } from '@/modules/addresses'
import { createAuditEventsRouter } from '@/modules/audit-events'
import { createAuthRouter } from '@/modules/auth'
import { createAuthAttemptsRouter } from '@/modules/auth-attempts'
import { createBillingRouter } from '@/modules/billing'
import {
  createAppsPublicRouter,
  createAppsRouter,
  findApiKeyByHash,
  markApiKeyUsed,
} from '@/modules/apps'
import { createCommunicationsRouter } from '@/modules/communications'
import { createDevicesRouter } from '@/modules/devices'
import { createFeaturesRouter } from '@/modules/features'
import {
  registerEducationRoutes,
  registerFinancialRoutes,
  registerGovernmentRoutes,
} from '@/modules/directory'
import { geoRouter } from '@/modules/geo'
import { healthRouter } from '@/modules/health'
import { createMembershipsRouter } from '@/modules/memberships'
import { createModulesRouter } from '@/modules/modules'
import { createMobileNumbersRouter } from '@/modules/mobile-numbers'
import { createOAuthRouter } from '@/modules/oauth'
import { createOnboardingRouter } from '@/modules/onboarding'
import {
  registerOrgAccessRoutes,
  registerOrganizationRoutes,
  registerOrgStructureRoutes,
} from '@/modules/organizations'
import { createProductsRouter } from '@/modules/products'
import { createProvisioningRouter } from '@/modules/provisioning'
import { createSessionsRouter } from '@/modules/sessions'
import {
  registerAddressRoutes,
  registerContactRoutes,
  registerIdentificationRoutes,
  registerPinRoutes,
  registerProfileRoutes,
  registerSelfRoutes,
  registerUserCoreRoutes,
} from '@/modules/users'
import { createTwilioWebhooksRouter } from '@/modules/twilio-webhooks'

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
 *   - then the protected modules, each built with the guard resolver.
 */
export function buildRoutes(): Router {
  const root = Router()
  const resolveGuards = createGuardResolver(buildAuthGuards())

  root.use(healthRouter)
  // Geo reference data is public: a sign-up form needs the country and currency
  // lists before the visitor has any credential to present.
  root.use(geoRouter)
  // Twilio cannot present a first-party 876 API key, so these routes are public
  // and authenticate on the request signature instead. They need no special
  // mounting order: Twilio's scheme signs the URL plus the sorted form
  // parameters, not the raw bytes, so parsing the body first is harmless.
  // The OAuth Authorization Server is public for the same reason: an OIDC
  // client cannot present a first-party 876 API key. Each endpoint carries its
  // own credential rule.
  root.use(createOAuthRouter(resolveGuards))
  // The app-metadata lookup an OAuth client hits before it holds any
  // credential, mounted outside the protected router exactly as api/v1.py does.
  root.use(createAppsPublicRouter())
  root.use(createTwilioWebhooksRouter(resolveGuards))

  root.use(createAddressesRouter(resolveGuards))
  root.use(createAuditEventsRouter(resolveGuards))
  root.use(createAuthRouter(resolveGuards))
  root.use(createAuthAttemptsRouter(resolveGuards))
  root.use(createCommunicationsRouter(resolveGuards))
  root.use(createDevicesRouter(resolveGuards))
  root.use(registerFinancialRoutes(resolveGuards))
  root.use(registerGovernmentRoutes(resolveGuards))
  root.use(registerEducationRoutes(resolveGuards))
  root.use(createAppsRouter(resolveGuards))
  root.use(createBillingRouter(resolveGuards))
  root.use(createFeaturesRouter(resolveGuards))
  root.use(createMembershipsRouter(resolveGuards))
  root.use(createModulesRouter(resolveGuards))
  root.use(createMobileNumbersRouter(resolveGuards))
  root.use(createOnboardingRouter(resolveGuards))
  root.use(registerOrganizationRoutes(resolveGuards))
  root.use(registerOrgStructureRoutes(resolveGuards))
  root.use(registerOrgAccessRoutes(resolveGuards))
  root.use(createProductsRouter(resolveGuards))
  root.use(createProvisioningRouter(resolveGuards))
  root.use(createSessionsRouter(resolveGuards))
  // `self` and the literal-prefixed groups mount before the core router, whose
  // `/:user_id` would otherwise match `me`, `username`, and friends as an id.
  root.use(registerSelfRoutes(resolveGuards))
  root.use(registerProfileRoutes(resolveGuards))
  root.use(registerAddressRoutes(resolveGuards))
  root.use(registerContactRoutes(resolveGuards))
  root.use(registerIdentificationRoutes(resolveGuards))
  root.use(registerPinRoutes(resolveGuards))
  root.use(registerUserCoreRoutes(resolveGuards))

  return root
}

/**
 * The auth guards, wired to the `apps` module's credential lookup.
 *
 * Exposed separately so a test can build the same guards over a stub lookup.
 */
export function buildAuthGuards(): AuthGuards {
  return createAuthGuards({ findApiKeyByHash, markApiKeyUsed })
}

/**
 * The tier → middleware mapping, mirroring how api/v1.py composes its routers:
 * every protected route sits behind the app API key, and the session and admin
 * dependencies stack on top of it rather than replacing it.
 *
 * The guards are attached per route rather than with `router.use`, so they run
 * only after a path matches — the same order FastAPI's router-level dependency
 * runs in. Mounted as middleware they would answer every unknown path with 401
 * instead of 404.
 */
export function createGuardResolver(guards: AuthGuards): GuardResolver {
  return (security) => {
    switch (security) {
      case 'public':
        return []
      case 'apiKey':
        return [guards.requireApiKey]
      case 'session':
        return [guards.requireApiKey, guards.requireSession]
      case 'admin':
        return [guards.requireApiKey, guards.requireAdmin]
    }
  }
}
