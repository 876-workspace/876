import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  organizationModuleListSchema,
  organizationModuleSchema,
  modulePreferencesSchema,
  type ModuleKey,
  type ToggleModuleBody,
  type OrganizationModule,
  type OrganizationModuleList,
  type ModulePreferences,
  type UpdateModulePreferencesBody,
} from '../types/settings.schema'

export function createSettingsResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/modules`
  const modulePath = (tenantId: string, moduleKey: ModuleKey) =>
    `${path(tenantId)}/${encodeURIComponent(moduleKey)}`
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
          path: modulePath(tenantId, moduleKey),
          body,
        },
        organizationModuleSchema
      )
    },
    preferences: {
      retrieve(tenantId: string, moduleKey: ModuleKey) {
        return AdminRequest<ModulePreferences>(
          runtime,
          {
            method: 'GET',
            path: `${modulePath(tenantId, moduleKey)}/preferences`,
          },
          modulePreferencesSchema
        )
      },
      update(
        tenantId: string,
        moduleKey: ModuleKey,
        body: UpdateModulePreferencesBody
      ) {
        return AdminRequest<ModulePreferences>(
          runtime,
          {
            method: 'PATCH',
            path: `${modulePath(tenantId, moduleKey)}/preferences`,
            body,
          },
          modulePreferencesSchema
        )
      },
    },
  }
}
