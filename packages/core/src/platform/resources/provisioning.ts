import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformProvisioningRevision,
  PlatformProvisioningRun,
} from '../types'
import type { ProvisioningTargetType } from '../../types/provisioning'

/** `platform.provisioning.*` — first-party manifest/materializer bootstrap. */
export function createPlatformProvisioningResource(runtime: PlatformRuntime) {
  return {
    /** Retrieves the immutable recipe currently used for new tenants. */
    retrievePublished(targetType: ProvisioningTargetType, targetKey: string) {
      return platformRequest<PlatformProvisioningRevision>(runtime, {
        method: 'GET',
        path: `/provisioning/manifests/${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}/published`,
      })
    },

    /** Claims queued direct-application work for this app's materializer. */
    claimApplication(organizationId: string, appId: string) {
      return platformRequest<PlatformProvisioningRun>(runtime, {
        method: 'POST',
        path: '/provisioning/runs/application/claim',
        body: { organization_id: organizationId, app_id: appId },
      })
    },

    /** Reports the atomic result of an application-owned materializer. */
    completeApplication(
      runId: string,
      result: { status: 'succeeded' } | { status: 'failed'; error: string }
    ) {
      return platformRequest<PlatformProvisioningRun>(runtime, {
        method: 'POST',
        path: `/provisioning/runs/${encodeURIComponent(runId)}/complete`,
        body: result,
      })
    },
  }
}
