import { listAppPermissionKeysForProvisioning } from '@/modules/app-access'

import type {
  ProvisioningResourceDefinition,
  ProvisioningResourceInput,
  ProvisioningValidationIssue,
} from './provisioning-catalog'

export const APP_ROLE_PROVISIONING_RESOURCE_TYPE = 'app_role'
const ENTERPRISE_APP_SLUG = '876-enterprise'
const ROLE_KEY = /^[a-z][a-z0-9_]*$/
const PERMISSION_KEY = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

export type ProvisioningAppRoleTemplate = {
  key: string
  name: string
  description: string | null
  permissions: string[]
  isDefault: boolean
  isSystem: boolean
  position: number
}

/** Catalog definition that can be merged into an application target registry. */
export function appRoleProvisioningDefinition(
  appSlug: string
): ProvisioningResourceDefinition | null {
  if (appSlug === ENTERPRISE_APP_SLUG) return null

  return {
    resourceType: APP_ROLE_PROVISIONING_RESOURCE_TYPE,
    label: 'App roles',
    description:
      'Organization-scoped role templates materialized when this app is provisioned.',
    multiple: true,
    minimumItems: 1,
    maximumItems: null,
    fields: [
      field('app_slug', 'App slug', 'string', true),
      field('role_key', 'Role key', 'string', true),
      field('name', 'Name', 'string', true),
      field('description', 'Description', 'string', false),
      field('permissions', 'Permissions', 'string', true),
      field('is_default', 'Default role', 'boolean', true),
      field('is_system', 'System role', 'boolean', true),
      field('position', 'Position', 'integer', true),
    ],
  }
}

function field(
  key: string,
  label: string,
  valueType: 'string' | 'integer' | 'boolean',
  required: boolean
) {
  return {
    key,
    label,
    valueType,
    required,
    referenceNamespace: null,
    allowedValues: null,
  } as const
}

function properties(resource: ProvisioningResourceInput) {
  return new Map(resource.properties.map((property) => [property.key, property]))
}

function readString(
  resource: ProvisioningResourceInput,
  key: string
): string | null {
  const property = properties(resource).get(key)
  return property?.valueType === 'string' ? property.stringValue : null
}

function readBoolean(
  resource: ProvisioningResourceInput,
  key: string
): boolean | null {
  const property = properties(resource).get(key)
  return property?.valueType === 'boolean' ? property.booleanValue : null
}

function readInteger(
  resource: ProvisioningResourceInput,
  key: string
): number | null {
  const property = properties(resource).get(key)
  return property?.valueType === 'integer' ? property.integerValue : null
}

export function parseProvisioningPermissionList(value: string | null): string[] {
  if (!value) return []
  return [...new Set(value.split(',').map((key) => key.trim()).filter(Boolean))].sort()
}

/** Converts provisioning property rows back to role-template domain values. */
export function parseAppRoleProvisioningResources(
  appSlug: string,
  resources: readonly ProvisioningResourceInput[]
): ProvisioningAppRoleTemplate[] {
  return resources
    .filter((resource) => resource.resourceType === APP_ROLE_PROVISIONING_RESOURCE_TYPE)
    .map((resource) => ({
      key: readString(resource, 'role_key') ?? '',
      name: readString(resource, 'name') ?? '',
      description: readString(resource, 'description'),
      permissions: parseProvisioningPermissionList(
        readString(resource, 'permissions')
      ),
      isDefault: readBoolean(resource, 'is_default') ?? false,
      isSystem: readBoolean(resource, 'is_system') ?? false,
      position: readInteger(resource, 'position') ?? 0,
    }))
    .filter(() => appSlug !== ENTERPRISE_APP_SLUG)
}

/**
 * Static validation for application-manifest app-role resources.
 * The generic provisioning validator still owns property type/cardinality
 * checks; this function owns app-access-specific identity/invariant checks.
 */
export function validateAppRoleProvisioningResources(
  appSlug: string,
  resources: readonly ProvisioningResourceInput[]
): ProvisioningValidationIssue[] {
  const issues: ProvisioningValidationIssue[] = []
  const roleResources = resources.filter(
    (resource) => resource.resourceType === APP_ROLE_PROVISIONING_RESOURCE_TYPE
  )

  if (appSlug === ENTERPRISE_APP_SLUG) {
    if (roleResources.length > 0)
      issues.push({
        path: 'resources',
        code: 'app_role_not_supported',
        message: '876 Enterprise is governed by organization roles and cannot declare app roles.',
      })
    return issues
  }

  if (roleResources.length === 0) {
    issues.push({
      path: 'resources',
      code: 'app_role_required',
      message: 'Application manifests must declare at least one app role.',
    })
    return issues
  }

  const roleKeys = new Set<string>()
  let defaultCount = 0

  roleResources.forEach((resource, index) => {
    const path = `resources.${index}`
    const declaredAppSlug = readString(resource, 'app_slug')
    const roleKey = readString(resource, 'role_key')
    const name = readString(resource, 'name')
    const permissionValue = readString(resource, 'permissions')
    const isDefault = readBoolean(resource, 'is_default')
    const isSystem = readBoolean(resource, 'is_system')
    const position = readInteger(resource, 'position')

    if (declaredAppSlug !== appSlug)
      issues.push({
        path: `${path}.properties.app_slug`,
        code: 'app_role_app_mismatch',
        message: `App role must declare app_slug '${appSlug}'.`,
      })

    if (!roleKey || !ROLE_KEY.test(roleKey))
      issues.push({
        path: `${path}.properties.role_key`,
        code: 'app_role_key_invalid',
        message: 'Role key must use lowercase letters, digits, or underscores.',
      })
    else {
      if (roleKeys.has(roleKey))
        issues.push({
          path: `${path}.properties.role_key`,
          code: 'app_role_key_duplicate',
          message: `Role key '${roleKey}' is declared more than once.`,
        })
      roleKeys.add(roleKey)

      if (resource.key !== `${appSlug}:${roleKey}`)
        issues.push({
          path: `${path}.key`,
          code: 'app_role_resource_key_invalid',
          message: `App role resource key must be '${appSlug}:${roleKey}'.`,
        })
    }

    if (!name?.trim())
      issues.push({
        path: `${path}.properties.name`,
        code: 'app_role_name_required',
        message: 'App role name is required.',
      })

    const permissions = parseProvisioningPermissionList(permissionValue)
    if (permissions.some((permission) => !PERMISSION_KEY.test(permission)))
      issues.push({
        path: `${path}.properties.permissions`,
        code: 'app_role_permission_invalid',
        message: 'Role permissions must use stable <module>.<action> keys.',
      })

    if (isDefault === null)
      issues.push({
        path: `${path}.properties.is_default`,
        code: 'app_role_default_required',
        message: 'is_default must be provided as a boolean.',
      })
    else if (isDefault) defaultCount += 1

    if (isSystem === null)
      issues.push({
        path: `${path}.properties.is_system`,
        code: 'app_role_system_required',
        message: 'is_system must be provided as a boolean.',
      })

    if (position === null)
      issues.push({
        path: `${path}.properties.position`,
        code: 'app_role_position_required',
        message: 'position must be provided as an integer.',
      })
  })

  if (defaultCount !== 1)
    issues.push({
      path: 'resources',
      code: 'app_role_default_count',
      message: 'Application manifests must declare exactly one default app role.',
    })

  return issues
}

/**
 * Publish-time validation against the persisted permission catalog. Run only
 * after static validation and after the target app has been resolved to appId.
 */
export async function validateAppRoleProvisioningPermissions(params: {
  appId: string
  appSlug: string
  resources: readonly ProvisioningResourceInput[]
}): Promise<ProvisioningValidationIssue[]> {
  if (params.appSlug === ENTERPRISE_APP_SLUG) return []

  const catalog = new Set(
    await listAppPermissionKeysForProvisioning(params.appId)
  )
  const issues: ProvisioningValidationIssue[] = []

  params.resources
    .filter(
      (resource) => resource.resourceType === APP_ROLE_PROVISIONING_RESOURCE_TYPE
    )
    .forEach((resource, index) => {
      const permissions = parseProvisioningPermissionList(
        readString(resource, 'permissions')
      )
      for (const permission of permissions) {
        if (!catalog.has(permission))
          issues.push({
            path: `resources.${index}.properties.permissions`,
            code: 'app_role_permission_unknown',
            message: `Permission '${permission}' is not registered for '${params.appSlug}'.`,
          })
      }
    })

  return issues
}
