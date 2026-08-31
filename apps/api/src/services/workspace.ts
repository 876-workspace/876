import { create876WorkOperatorClient } from '@876/work/operator'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  assignMemberApps,
  ensureOrgAppsFinanceReady,
  linkMembershipRole,
  provisionOrganization,
  WORK_DEPENDENT_APP_SLUGS,
} from './provisioning'
import {
  isProvisionedWorkEnabled,
  retrievePersistedProvisioningPolicy,
  workScopesForProvisionedApp,
} from './provisioning-policy'
import * as provisioningRepository from './provisioning.repository'

const log = getLogger('workspace')

/** Internal organization-workspace control plane. */
export const workspace = {
  async setup(
    organizationId: string,
    options: {
      sourceAppId?: string | null
      finance?: 'ready' | 'defer'
      requireProvisioningSelection?: boolean
      now?: number
    } = {}
  ) {
    return provisionOrganization(
      organizationId,
      options.now ?? nowUnixSeconds(),
      {
        sourceAppId: options.sourceAppId ?? null,
        deferFinanceReadiness: options.finance === 'defer',
        requireProvisioningSelection:
          options.requireProvisioningSelection ?? false,
      }
    )
  },

  apps: {
    assign(params: {
      organizationId: string
      userId: string
      sourceAppId?: string | null
      assignedBy?: string | null
      now?: number
    }) {
      return assignMemberApps({
        ...params,
        now: params.now ?? nowUnixSeconds(),
      })
    },
  },

  roles: {
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
    ensure(params: { organizationId: string; appIds?: string[] }) {
      return ensureOrgAppsFinanceReady(
        params.organizationId,
        params.appIds ? { appIds: params.appIds } : {}
      )
    },
  },

  work: {
    /**
     * Apply the selected setup's Work gate and capability policy.
     *
     * The tenant is created from `service/work`, independently of any product
     * app. Connections are then created only for subscribed Work consumers and
     * receive the intersection of that app's declared grant with capabilities
     * enabled by the setup. This operation is idempotent in Work.
     */
    async ensure(params: {
      organizationId: string
      appIds?: string[]
    }): Promise<void> {
      const selected = await retrievePersistedProvisioningPolicy(
        params.organizationId
      )
      if (!selected) {
        log.warn(
          { organization_id: params.organizationId },
          'work_provisioning.setup_selection_missing'
        )
        return
      }

      if (!isProvisionedWorkEnabled(selected.policy)) {
        log.info(
          {
            organization_id: params.organizationId,
            setup_key: selected.selection.setup_key,
          },
          'work_provisioning.disabled_by_setup'
        )
        return
      }

      const settings = getSettings()
      const url = settings.work.url.trim()
      const internalKey = settings.work.internalKey.trim()
      if (!url || !internalKey) {
        log.warn(
          {
            organization_id: params.organizationId,
            setup_key: selected.selection.setup_key,
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

      const tenant = await work.workspace.ensure(params.organizationId)
      if (tenant.error) {
        throw new AppHttpError({
          code: 'provisioning/work-workspace-unavailable',
          message: 'The Work workspace could not be prepared.',
          httpStatus: 503,
        })
      }

      for (const slug of WORK_DEPENDENT_APP_SLUGS) {
        const app = await provisioningRepository.findAppBySlug(slug)
        if (!app || !appIds.includes(app.id)) continue

        const scopes = workScopesForProvisionedApp(slug, selected.policy)
        if (scopes.length === 0) {
          log.info(
            {
              organization_id: params.organizationId,
              app_slug: slug,
              setup_key: selected.selection.setup_key,
            },
            'work_provisioning.no_enabled_capabilities'
          )
          continue
        }

        const connection = await work.workspace.ensure(params.organizationId, {
          appId: app.id,
          scopes,
        })
        if (connection.error) {
          throw new AppHttpError({
            code: 'provisioning/work-workspace-unavailable',
            message: `The Work connection for ${slug} could not be prepared.`,
            httpStatus: 503,
          })
        }
      }
    },
  },
} as const
