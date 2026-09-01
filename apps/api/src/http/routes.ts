import { Router } from 'express'

import type { GuardResolver } from '@/http/api-router'
import { createAuthGuards, type AuthGuards } from '@/http/auth'
import { createAddressesRouter } from '@/modules/addresses'
import { registerAppAccessRoutes } from '@/modules/app-access'
import { createAuditEventsRouter } from '@/modules/audit-events'
import { createAuthRouter, findLiveSession } from '@/modules/auth'
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
import {
  createApplicationProvisioningProfileRouter,
  createProvisioningResourceRouter,
  createProvisioningRouter,
  createProvisioningSetupPolicyRouter,
} from '@/modules/provisioning'
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
import { createWorkosWebhooksRouter } from '@/modules/workos-webhooks'

/**
 * Router composition. The only file in `http/` allowed to import a module —
 * this is the composition root where the service's surface is assembled, and
 * where the auth guards are given the credential lookup they cannot import
 * themselves.
 */
export function buildRoutes(): Router {
  const root = Router()
  const resolveGuards = createGuardResolver(buildAuthGuards())

  root.use(healthRouter)
  root.use(geoRouter)
  root.use(createOAuthRouter(resolveGuards))
  root.use(createAppsPublicRouter())
  root.use(createTwilioWebhooksRouter(resolveGuards))
  root.use(createWorkosWebhooksRouter(resolveGuards))

  root.use(createAddressesRouter(resolveGuards))
  root.use(registerAppAccessRoutes(resolveGuards))
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
  root.use(createProvisioningResourceRouter(resolveGuards))
  root.use(createProvisioningSetupPolicyRouter(resolveGuards))
  root.use(createApplicationProvisioningProfileRouter(resolveGuards))
  root.use(createSessionsRouter(resolveGuards))
  root.use(registerSelfRoutes(resolveGuards))
  root.use(registerProfileRoutes(resolveGuards))
  root.use(registerAddressRoutes(resolveGuards))
  root.use(registerContactRoutes(resolveGuards))
  root.use(registerIdentificationRoutes(resolveGuards))
  root.use(registerPinRoutes(resolveGuards))
  root.use(registerUserCoreRoutes(resolveGuards))

  return root
}

/** The auth guards, wired to canonical credential lookups. */
export function buildAuthGuards(): AuthGuards {
  return createAuthGuards({ findApiKeyByHash, markApiKeyUsed, findLiveSession })
}

/** Maps each declared route security tier to its concrete middleware chain. */
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
      case 'scheduler':
        return [guards.requireScheduler]
    }
  }
}
