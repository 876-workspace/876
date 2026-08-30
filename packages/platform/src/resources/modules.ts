import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminApplicationModule,
  AdminApplicationModuleCreateParams,
  AdminApplicationModuleUpdateParams,
  AdminDeletedApplicationModule,
  AdminListResponse,
} from '../types'

/** `$876.modules.*` — durable application capability administration. */
export function createAdminModulesResource(runtime: AdminRuntime) {
  return {
    list(appId: string, params?: { includeArchived?: boolean }) {
      return adminRequest<AdminListResponse<AdminApplicationModule>>(runtime, {
        method: 'GET',
        path: '/modules',
        query: { appId, ...params },
      })
    },
    listEntitled(organizationId: string, appId: string) {
      return adminRequest<AdminListResponse<AdminApplicationModule>>(runtime, {
        method: 'GET',
        path: '/modules/entitlements',
        query: { organizationId, appId },
      })
    },
    retrieve(moduleId: string) {
      return adminRequest<AdminApplicationModule>(runtime, {
        method: 'GET',
        path: `/modules/${moduleId}`,
      })
    },
    create(body: AdminApplicationModuleCreateParams) {
      return adminRequest<AdminApplicationModule>(runtime, {
        method: 'POST',
        path: '/modules',
        body,
      })
    },
    update(moduleId: string, body: AdminApplicationModuleUpdateParams) {
      return adminRequest<AdminApplicationModule>(runtime, {
        method: 'PATCH',
        path: `/modules/${moduleId}`,
        body,
      })
    },
    archive(moduleId: string) {
      return adminRequest<AdminDeletedApplicationModule>(runtime, {
        method: 'DELETE',
        path: `/modules/${moduleId}`,
      })
    },
  }
}
