import { Router } from 'express'

import type { GuardResolver } from '@/http/api-router'
import { createAuthGuards, type AuthDependencies } from '@/http/auth'
import { hashApiKey } from '@/http/auth/credentials'
import { getSettings } from '@/config'
import { healthRouter } from '@/modules/health'
import { createTenantsRouter } from '@/modules/tenants'

export function buildRoutes(): Router {
  const root = Router()
  const resolveGuards = createGuardResolver(buildAuthGuards())

  root.use(healthRouter)
  root.use(createTenantsRouter(resolveGuards))

  return root
}

export function buildAuthGuards() {
  return createAuthGuards({ findApiKeyByHash, markApiKeyUsed })
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
      case 'session':
        return [guards.requireApiKey, guards.requireSession]
      case 'admin':
        return [guards.requireApiKey, guards.requireAdmin]
    }
  }
}
