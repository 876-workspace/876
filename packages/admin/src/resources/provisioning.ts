import { toCursorQuery, type CursorPageParams } from '@876/core/client'

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
      list(
        params?: CursorPageParams & {
          organizationId?: string
          appId?: string
          status?: AdminProvisioningRunStatus
        }
      ) {
        return adminRequest<AdminListResponse<AdminProvisioningRun>>(runtime, {
          method: 'GET',
          path: '/provisioning/runs',
          query: {
            ...toCursorQuery(params),
            organization_id: params?.organizationId,
            app_id: params?.appId,
            status: params?.status,
          },
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

      claimApplication(body: { organizationId: string; appId: string }) {
        return adminRequest<AdminProvisioningRun>(runtime, {
          method: 'POST',
          path: '/provisioning/runs/application/claim',
          body: {
            organization_id: body.organizationId,
            app_id: body.appId,
          },
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
        appId?: string | null
        organizationId?: string | null
        limit?: number
        startingAfter?: string | null
      }) {
        return adminRequest<AdminProvisioningReconciliationResult>(runtime, {
          method: 'POST',
          path: '/provisioning/runs/reconcile',
          body: {
            app_id: body.appId,
            organization_id: body.organizationId,
            limit: body.limit,
            starting_after: body.startingAfter,
          },
        })
      },
    },

    notes: {
      list(
        targetType: AdminProvisioningTargetType,
        targetKey: string,
        params?: CursorPageParams
      ) {
        return adminRequest<AdminListResponse<AdminProvisioningNote>>(runtime, {
          method: 'GET',
          path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/notes`,
          query: toCursorQuery(params),
        })
      },

      create(
        targetType: AdminProvisioningTargetType,
        targetKey: string,
        body: { body: string; authorUserId?: string | null }
      ) {
        return adminRequest<AdminProvisioningNote>(runtime, {
          method: 'POST',
          path: `/provisioning/manifests/${targetPath(targetType, targetKey)}/notes`,
          body: {
            body: body.body,
            author_user_id: body.authorUserId,
          },
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
