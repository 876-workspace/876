import { create876WorkOperatorClient } from '@876/work/operator'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  assignMemberApps,
  ensureOrgAppsFinanceReady,
  linkMembershipRole,
  provisionOrganization,
  WORK_DEPENDENT_APP_SLUGS,
} from './provisioning'
import * as provisioningRepository from './provisioning.repository'

const log = getLogger('workspace')

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

  work: {
    /** Prepare an org's Work workspace and each Work-dependent app's connection. */
    async ensure(params: {
      organizationId: string
      appIds?: string[]
    }): Promise<void> {
      const settings = getSettings()
      const url = settings.work.url.trim()
      const internalKey = settings.work.internalKey.trim()

      if (!url || !internalKey) {
        log.warn(
          {
            organization_id: params.organizationId,
            has_work_api_url: Boolean(url),
            has_work_internal_key: Boolean(internalKey),
          },
          'work_provisioning.not_configured'
        )
        return
      }

      const appIds =
        params.appIds ??
        (await provisioningRepository.listSubscribedAppIds(
          params.organizationId
        ))
      const work = create876WorkOperatorClient({ baseUrl: url, internalKey })

      for (const slug of WORK_DEPENDENT_APP_SLUGS) {
        const app = await provisioningRepository.findAppBySlug(slug)
        if (!app) {
          log.warn(
            { organization_id: params.organizationId, app_slug: slug },
            'work_provisioning.app_not_found'
          )
          continue
        }
        if (!appIds.includes(app.id)) continue

        try {
          const result = await work.workspace.ensure(
            params.organizationId,
            app.id
          )
          if (result.error) {
            log.error(
              {
                organization_id: params.organizationId,
                app_id: app.id,
                error_code: result.error.code,
              },
              'work_provisioning.failed'
            )
          }
        } catch (error) {
          log.error(
            {
              err: error,
              organization_id: params.organizationId,
              app_id: app.id,
            },
            'work_provisioning.failed'
          )
        }
      }
    },
  },
} as const
