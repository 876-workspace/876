import type { NextFunction, Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { errors } from '@/http/errors'
import { retrieveTenantByOrgId } from '@/modules/tenants/tenants.service'

/**
 * Resolves the authenticated caller's own Courier tenant from the bearer
 * token's `org_id` claim and attaches it to `req.tenant`. Used by the
 * application-context routes (`/v1/me/...`) so normal Couriers call sites
 * never carry a browser-supplied tenant ID.
 *
 * Requires a session principal (`requireSession` must run first).
 */
export async function resolveCurrentTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = getPrincipal(req).orgId
    if (!orgId) throw errors.noSession()
    const tenant = await retrieveTenantByOrgId(orgId)
    req.tenant = tenant
    next()
  } catch (error) {
    next(error)
  }
}

declare global {
  // `namespace` is the only way to augment Express's Request type here; the
  // config registers the TypeScript parser but not the plugin that owns
  // no-namespace, so disabling that rule would reference a rule ESLint
  // cannot resolve.
  namespace Express {
    interface Request {
      tenant?: {
        id: string
        org_id: string
        slug: string
        name: string
        mailbox_prefix: string | null
        status: string
        created_at: number
        updated_at: number
      }
    }
  }
}
