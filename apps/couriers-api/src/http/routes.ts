import { Router } from 'express'

import type { GuardResolver } from '@/http/api-router'
import { createAuthGuards, type AuthDependencies } from '@/http/auth'
import { hashApiKey } from '@/http/auth/credentials'
import { getSettings } from '@/config'
import { healthRouter } from '@/modules/health'
import { createBranchesRouter } from '@/modules/branches'
import { createAddressesRouter } from '@/modules/addresses'
import { createCustomerAddressesRouter } from '@/modules/customer-addresses'
import { createCustomersRouter } from '@/modules/customers'
import { createMailboxesRouter } from '@/modules/mailboxes'
import { createOrganizationLocationsRouter } from '@/modules/organization-locations'
import { createPackagesRouter } from '@/modules/packages'
import { createPortalRouter } from '@/modules/portal'
import { createTeamRouter } from '@/modules/team'
import { createSettingsRouter } from '@/modules/settings'
import { createTenantsRouter } from '@/modules/tenants'
import { createWarehousesRouter } from '@/modules/warehouses'
import { createMeRouter } from '@/modules/me'

export function buildRoutes(): Router {
  const root = Router()
  const resolveGuards = createGuardResolver(buildAuthGuards())

  root.use(healthRouter)
  root.use(createTenantsRouter(resolveGuards))
  root.use(createMeRouter(resolveGuards))
  root.use(createAddressesRouter(resolveGuards))
  root.use(createBranchesRouter(resolveGuards))
  root.use(createCustomersRouter(resolveGuards))
  root.use(createCustomerAddressesRouter(resolveGuards))
  root.use(createMailboxesRouter(resolveGuards))
  root.use(createOrganizationLocationsRouter(resolveGuards))
  root.use(createPackagesRouter(resolveGuards))
  root.use(...createPortalRouter(resolveGuards))
  root.use(...createTeamRouter(resolveGuards))
  root.use(createSettingsRouter(resolveGuards))
  root.use(createWarehousesRouter(resolveGuards))

  return root
}

export function buildAuthGuards() {
  return createAuthGuards({
    findApiKeyByHash,
    markApiKeyUsed,
  })
}

async function findApiKeyByHash(keyHash: string) {
  const configured = getSettings().api876Key
  if (!configured) return null
  const expected = hashApiKey(configured)
  if (keyHash !== expected) return null
  return {
    id: 'api-key-876',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  }
}

async function markApiKeyUsed(): Promise<void> {
  // No-op telemetry for Couriers API single-key mode.
}

export function createGuardResolver(
  guards: ReturnType<typeof createAuthGuards>
): GuardResolver {
  return (security) => {
    switch (security) {
      case 'public':
        return []
      case 'apiKey':
        return [guards.requireApiKey]
      case 'integration':
        return [guards.requireIntegration]
      case 'session':
        return [guards.requireApiKey, guards.requireSession]
      case 'admin':
        return [guards.requireApiKey, guards.requireAdmin]
    }
  }
}
