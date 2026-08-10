import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  organizationModuleListSchema,
  organizationModuleSchema,
  type ModuleKey,
  type ToggleModuleBody,
  type OrganizationModule,
  type OrganizationModuleList,
} from '../types/settings.schema'

export function createSettingsResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/modules`
  return {
    list(tenantId: string) {
      return AdminRequest<OrganizationModuleList>(
        runtime,
        { method: 'GET', path: path(tenantId) },
        organizationModuleListSchema
      )
    },
    update(tenantId: string, moduleKey: ModuleKey, body: ToggleModuleBody) {
      return AdminRequest<OrganizationModule>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(moduleKey)}`,
          body,
        },
        organizationModuleSchema
      )
    },
  }
}
