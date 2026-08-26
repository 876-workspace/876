import { nowUnixSeconds } from '@/platform/timestamps'

import {
  assignMemberApps,
  ensureOrgAppsFinanceReady,
  linkMembershipRole,
  provisionOrganization,
} from './provisioning'

/**
 * Internal organization-workspace control plane.
 *
 * `$876` remains the resource/data facade (`$876.invoices.create()`,
 * `$876.customers.list()`, ...). This object owns the orchestration needed to
 * prepare and govern the organization environment itself.
 *
 * The descriptive implementation helpers stay in their owning modules. Callers
 * should prefer this facade so they read in terms of intent rather than outbox,
 * reconciliation, or repository mechanics.
 *
 * Only add a method here when a call site actually migrates onto it. A wrapper
 * with no caller is a second permanent path to the same operation, which is
 * exactly what `workspace-control-plane.md` forbids.
 */
export const workspace = {
  /**
   * Prepare an organization's durable workspace: default roles, app
   * entitlements, and relationship-registry synchronization.
   *
   * `finance: 'defer'` skips the shared finance readiness barrier; the caller
   * must then run {@link workspace.finance.ensure} once the durable owner
   * membership exists, so a finance outage cannot strand an org whose owner
   * has no membership to route back to.
   */
  async setup(
    organizationId: string,
    options: {
      sourceAppId?: string | null
      finance?: 'ready' | 'defer'
      now?: number
    } = {}
  ) {
    return provisionOrganization(
      organizationId,
      options.now ?? nowUnixSeconds(),
      {
        sourceAppId: options.sourceAppId ?? null,
        deferFinanceReadiness: options.finance === 'defer',
      }
    )
  },

  apps: {
    /** Grant a member their organization's app assignments. */
    assign(params: {
      organizationId: string
      userId: string
      sourceAppId?: string | null
      assignedBy?: string | null
      now?: number
    }) {
      // Pass through rather than defaulting `sourceAppId`/`assignedBy` here;
      // `assignMemberApps` already owns those defaults, and duplicating them
      // gives the same value two definition sites.
      return assignMemberApps({
        ...params,
        now: params.now ?? nowUnixSeconds(),
      })
    },
  },

  roles: {
    /** Point a membership at its organization's role row for `role`. */
    link(
      membership: {
        id: string
        organizationId: string
        role: string
        roleId: string | null
      },
      now = nowUnixSeconds()
    ) {
      return linkMembershipRole(membership, now)
    },
  },

  finance: {
    /** Run the shared finance readiness barrier for an org's apps. */
    ensure(params: { organizationId: string; appIds?: string[] }) {
      return ensureOrgAppsFinanceReady(
        params.organizationId,
        params.appIds ? { appIds: params.appIds } : {}
      )
    },
  },
} as const
