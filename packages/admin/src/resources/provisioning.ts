import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedProvisioningNote,
  AdminListResponse,
  AdminProvisioningCatalog,
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningNote,
  AdminProvisioningReconciliationResult,
  AdminProvisioningRun,
  AdminProvisioningRunStatus,
  AdminProvisioningTargetType,
  AdminProvisioningValidation,
} from '../types'

const targetPath = (
  targetType: AdminProvisioningTargetType,
  targetKey: string
) => `${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}`

/** `$876.provisioning.*` — generic manifest-v1 administration. */
export function createAdminProvisioningResource(runtime: AdminRuntime) {
  return {
    retrieve(targetType: AdminProvisioningTargetType, targetKey: string) {
      return adminRequest<AdminProvisioningManifest>(runtime, {
        method: 'GET',
        path: `/provisioning/manifests/${targetPath(targetType, targetKey)}`,
      })
    },

    retrievePublished(
      targetType: AdminProvisioningTargetType,
      targetKey: string
    ) {
      return adminRequest<AdminProvisioningManifestRevision>(runtime, {
        method: 'GET',
        path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/published`,
      })
    },

    retrieveCatalog(
      targetType: AdminProvisioningTargetType,
      targetKey: string
    ) {
      return adminRequest<AdminProvisioningCatalog>(runtime, {
        method: 'GET',
        path: `/provisioning/catalog/${targetPath(targetType, targetKey)}`,
      })
    },

    replaceDraft(
      targetType: AdminProvisioningTargetType,
      targetKey: string,
      body: AdminProvisioningDraftReplaceParams
    ) {
      return adminRequest<AdminProvisioningManifestRevision>(runtime, {
        method: 'PUT',
        path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/draft`,
        body,
      })
    },

    validate(
      targetType: AdminProvisioningTargetType,
      targetKey: string,
      body: AdminProvisioningDraftReplaceParams
    ) {
      return adminRequest<AdminProvisioningValidation>(runtime, {
        method: 'POST',
        path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/validate`,
        body,
      })
    },

    publish(targetType: AdminProvisioningTargetType, targetKey: string) {
      return adminRequest<AdminProvisioningManifestRevision>(runtime, {
        method: 'POST',
        path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/publish`,
      })
    },

    runs: {
      list(params?: {
        organization_id?: string
        app_id?: string
        status?: AdminProvisioningRunStatus
        limit?: number
        starting_after?: string
        ending_before?: string
      }) {
        return adminRequest<AdminListResponse<AdminProvisioningRun>>(runtime, {
          method: 'GET',
          path: '/provisioning/runs',
          query: params,
        })
      },

      retrieve(runId: string) {
        return adminRequest<AdminProvisioningRun>(runtime, {
          method: 'GET',
          path: `/provisioning/runs/${encodeURIComponent(runId)}`,
        })
      },

      retry(runId: string) {
        return adminRequest<AdminProvisioningRun>(runtime, {
          method: 'POST',
          path: `/provisioning/runs/${encodeURIComponent(runId)}/retry`,
        })
      },

      claimApplication(body: { organization_id: string; app_id: string }) {
        return adminRequest<AdminProvisioningRun>(runtime, {
          method: 'POST',
          path: '/provisioning/runs/application/claim',
          body,
        })
      },

      completeApplication(
        runId: string,
        body: { status: 'succeeded' } | { status: 'failed'; error: string }
      ) {
        return adminRequest<AdminProvisioningRun>(runtime, {
          method: 'POST',
          path: `/provisioning/runs/${encodeURIComponent(runId)}/complete`,
          body,
        })
      },

      reconcile(body: {
        app_id?: string | null
        organization_id?: string | null
        limit?: number
        starting_after?: string | null
      }) {
        return adminRequest<AdminProvisioningReconciliationResult>(runtime, {
          method: 'POST',
          path: '/provisioning/runs/reconcile',
          body,
        })
      },
    },

    notes: {
      list(
        targetType: AdminProvisioningTargetType,
        targetKey: string,
        params?: {
          limit?: number
          starting_after?: string
          ending_before?: string
        }
      ) {
        return adminRequest<AdminListResponse<AdminProvisioningNote>>(runtime, {
          method: 'GET',
          path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/notes`,
          query: params,
        })
      },

      create(
        targetType: AdminProvisioningTargetType,
        targetKey: string,
        body: { body: string; author_user_id?: string | null }
      ) {
        return adminRequest<AdminProvisioningNote>(runtime, {
          method: 'POST',
          path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/notes`,
          body,
        })
      },

      delete(
        targetType: AdminProvisioningTargetType,
        targetKey: string,
        noteId: string
      ) {
        return adminRequest<AdminDeletedProvisioningNote>(runtime, {
          method: 'DELETE',
          path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/notes/${encodeURIComponent(noteId)}`,
        })
      },
    },
  }
}
