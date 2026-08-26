import { nowUnixSeconds } from '@/platform/timestamps'

import {
  enqueueCustomerArchiveForOrganization,
  enqueueCustomerEnsureForOrganization,
  type OrganizationRow as CustomerOrganizationRow,
} from './billing-customer-sync'
import { createBillingCustomerSyncRepository } from './billing-customer-sync.repository'
import { applyBillingWorkspaceLifecycle } from './billing-workspace-lifecycle'
import {
  reconcileFinanceConnections,
  type ProvisioningRunTrigger,
} from './finance-provisioning'
import { ensureAppReady } from './finance-provisioning-readiness'
import { createFinanceProvisioningRepository } from './finance-provisioning.repository'
import {
  assignMemberApps,
  ensureDefaultContact,
  ensureOrgAppSubscriptions,
  ensureOrgAppsFinanceReady,
  linkMembershipRole,
  provisionOrganization,
  resolveMemberPermissions,
  seedDefaultRoles,
} from './provisioning'

function customerDeps() {
  return { repository: createBillingCustomerSyncRepository() }
}

function financeDeps() {
  return { repository: createFinanceProvisioningRepository() }
}

/**
 * Internal organization-workspace control plane.
 *
 * `$876` remains the resource/data facade (`$876.invoices.create()`,
 * `$876.customers.list()`, ...). This object owns the orchestration needed to
 * prepare and govern the organization environment itself: app readiness,
 * default roles, member assignments, registry synchronization, and finance
 * workspace lifecycle.
 *
 * The descriptive implementation helpers stay in their owning modules. Callers
 * should prefer this facade so they read in terms of intent rather than outbox,
 * reconciliation, or repository mechanics.
 */
export const workspace = {
  async setup(
    organizationId: string,
    options: {
      sourceAppId?: string | null
      finance?: 'ready' | 'defer'
      now?: number
    } = {}
  ) {
    return provisionOrganization(organizationId, options.now ?? nowUnixSeconds(), {
      sourceAppId: options.sourceAppId ?? null,
      deferFinanceReadiness: options.finance === 'defer',
    })
  },

  apps: {
    ensure(
      organizationId: string,
      options: { sourceAppId?: string | null } = {}
    ) {
      return ensureOrgAppSubscriptions(organizationId, options)
    },

    assign(params: {
      organizationId: string
      userId: string
      sourceAppId?: string | null
      assignedBy?: string | null
      now?: number
    }) {
      return assignMemberApps({
        organizationId: params.organizationId,
        userId: params.userId,
        sourceAppId: params.sourceAppId ?? null,
        assignedBy: params.assignedBy ?? null,
        now: params.now ?? nowUnixSeconds(),
      })
    },
  },

  roles: {
    ensure(organizationId: string, now = nowUnixSeconds()) {
      return seedDefaultRoles(organizationId, now)
    },

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

    permissions(membership: {
      roleId: string | null
      organizationId: string
      role: string
    }) {
      return resolveMemberPermissions(membership)
    },
  },

  contacts: {
    ensure(
      organizationId: string,
      user: {
        id: string
        firstName: string
        lastName: string | null
        email: string | null
        phone: string | null
      },
      now = nowUnixSeconds()
    ) {
      return ensureDefaultContact(organizationId, user, now)
    },
  },

  customers: {
    ensure(organization: CustomerOrganizationRow, now = nowUnixSeconds()) {
      return enqueueCustomerEnsureForOrganization(
        customerDeps(),
        organization,
        now
      )
    },

    archive(organization: CustomerOrganizationRow, now = nowUnixSeconds()) {
      return enqueueCustomerArchiveForOrganization(
        customerDeps(),
        organization,
        now
      )
    },
  },

  finance: {
    async ensure(params: {
      organizationId: string
      appId?: string
      appIds?: string[]
      expected?: 'embedded'
      trigger?: ProvisioningRunTrigger
    }) {
      if (params.appId) {
        return ensureAppReady(financeDeps(), {
          organizationId: params.organizationId,
          appId: params.appId,
          expectedFinanceDependency: params.expected,
          trigger: params.trigger,
        })
      }

      return ensureOrgAppsFinanceReady(params.organizationId, {
        appIds: params.appIds,
      })
    },

    reconcile(params: {
      organizationId?: string | null
      appId?: string | null
      limit?: number | null
      startingAfter?: string | null
      trigger?: ProvisioningRunTrigger
    }) {
      return reconcileFinanceConnections(financeDeps(), {
        organizationId: params.organizationId ?? null,
        appId: params.appId ?? null,
        limit: params.limit ?? null,
        startingAfter: params.startingAfter ?? null,
        trigger: params.trigger,
      })
    },

    archive(params: {
      organizationId: string
      deletedBy?: string | null
      reason?: string | null
    }) {
      return applyBillingWorkspaceLifecycle({
        organizationId: params.organizationId,
        action: 'archive',
        deletedBy: params.deletedBy ?? null,
        reason: params.reason ?? null,
      })
    },

    restore(organizationId: string) {
      return applyBillingWorkspaceLifecycle({
        organizationId,
        action: 'restore',
      })
    },
  },
} as const
