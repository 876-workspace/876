import type { Admin876Client } from '@876/admin'

function createProvisioningSurface(
  provisioning: Admin876Client['provisioning']
) {
  return {
    published: {
      retrieve: provisioning.retrievePublished,
    },
    catalog: {
      retrieve: provisioning.retrieveCatalog,
    },
    draft: {
      retrieve: provisioning.retrieve,
      update: provisioning.replaceDraft,
      validate: provisioning.validate,
      publish: provisioning.publish,
    },
    runs: {
      list: provisioning.runs.list,
      retrieve: provisioning.runs.retrieve,
      retry: provisioning.runs.retry,
      reconcile: provisioning.runs.reconcile,
      claim: provisioning.runs.claimApplication,
      complete: provisioning.runs.completeApplication,
    },
    notes: provisioning.notes,
  }
}

/**
 * Organization workspace control plane.
 *
 * This surface configures and prepares an organization's 876 environment. It
 * deliberately does not expose ordinary business resources such as invoices,
 * customers, packages, or files; those remain on the flat `$876` facade.
 */
export function createWorkspaceControlPlane(admin: Admin876Client) {
  return {
    onboarding: admin.onboarding,
    apps: {
      list: admin.appAssignments.list,
      assign: admin.appAssignments.create,
      unassign: admin.appAssignments.revoke,
      /**
       * Org-to-app entitlement administration (`/organizations/{id}/apps`).
       *
       * Distinct from `$876.subscriptions.*`, which are Billing's own
       * subscription records. An entitlement decides whether an organization
       * may open a product app at all, so it is workspace configuration
       * rather than a business resource.
       */
      entitlements: {
        list: admin.organizations.subscriptions.list,
        retrieve: admin.organizations.subscriptions.retrieve,
        grant: admin.organizations.subscriptions.create,
        update: admin.organizations.subscriptions.update,
      },
    },
    modules: admin.modules,
    features: admin.organizationFeatures,
    provisioning: createProvisioningSurface(admin.provisioning),
  }
}

/**
 * 876 operator control plane.
 *
 * These resources configure or inspect the platform itself rather than one
 * organization's business data, so Console accesses them through `platform`
 * instead of mixing them into the `$876` resource facade.
 */
export function createPlatformControlPlane(admin: Admin876Client) {
  return {
    apiKeys: admin.apiKeys,
    authAttempts: admin.authAttempts,
    devices: admin.devices,
    appFeatures: admin.appFeatures,
    reservedUsernames: admin.reservedUsernames,
  }
}

export type WorkspaceControlPlane = ReturnType<
  typeof createWorkspaceControlPlane
>
export type PlatformControlPlane = ReturnType<typeof createPlatformControlPlane>
