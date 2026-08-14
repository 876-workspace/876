import type { Request } from 'express'

import type { CredentialKind } from './credentials'

export type BillingPrincipal = {
  kind: CredentialKind
  tenantId: string | null
  organizationId: string | null
  userId: string | null
  appId: string | null
  scopes: ReadonlySet<string>
  permissions: ReadonlySet<string>
  platformAdmin: boolean
}

const principals = new WeakMap<Request, BillingPrincipal>()

export function getPrincipal(req: Request): BillingPrincipal {
  const principal = principals.get(req)
  if (!principal) throw new Error('Billing principal has not been resolved.')
  return principal
}

export function setPrincipal(req: Request, principal: BillingPrincipal): void {
  principals.set(req, principal)
}
