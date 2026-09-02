import { listAppPermissionKeysForProvisioning } from '@/modules/app-access/app-access-lookup.service'

import type {
  ProvisioningResourceDefinition,
  ProvisioningResourceInput,
  ProvisioningValidationIssue,
} from './provisioning-catalog.types'

export const APP_ROLE_PROVISIONING_RESOURCE_TYPE = 'app-role'
const LEGACY_APP_ROLE_PROVISIONING_RESOURCE_TYPE = 'app_role'
const ENTERPRISE_APP_SLUG = '876-enterprise'
const ROLE_KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const PERMISSION_KEY =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const STANDARD_ROLE_KEYS = ['super-admin', 'admin', 'staff'] as const

const LEGACY_PROPERTY_KEYS: Readonly<Record<string, string>> = {
  'app-slug': 'app_slug',
  'role-key': 'role_key',
  'is-default': 'is_default',
  'is-system': 'is_system',
}

export type ProvisioningAppRoleTemplate = {
  key: string
  name: string
  description: string | null
  permissions: string[]
  isDefault: boolean
  isSystem: boolean
  position: number
}

function canonicalRoleKey(value: string | null): string | null {
  if (value === 'super_admin') return 'super-admin'
  return value
}

function isAppRoleResource(resource: ProvisioningResourceInput): boolean {
  return (
    resource.resourceType === APP_ROLE_PROVISIONING_RESOURCE_TYPE ||
    resource.resourceType === LEGACY_APP_ROLE_PROVISIONING_RESOURCE_TYPE
  )
}

function provisioningString(key: string, value: string) {
  return {
    key,
    valueType: 'string' as const,
    stringValue: value,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }
}

/** Builds the mandatory role resources for a newly created app profile. */
export async function buildStandardAppRoleProvisioningResources(
  appId: string,
  appSlug: string
): Promise<ProvisioningResourceInput[]> {
  if (appSlug === ENTERPRISE_APP_SLUG) return []

  const catalog = (await listAppPermissionKeysForProvisioning(appId)).sort()
  const definitions = [
    {
      key: 'super-admin',
      name: 'Super Admin',
      description: 'Full access to this application.',
      permissions: catalog,
      isDefault: false,
      position: 0,
    },
    {
      key: 'admin',
      name: 'Admin',
      description:
        'Administrative and operational access without destructive actions.',
      permissions: catalog.filter(
        (permission) => !permission.endsWith('.delete')
      ),
      isDefault: false,
      position: 10,
    },
    {
      key: 'staff',
      name: 'Staff',
      description: 'Read-only access to this application.',
      permissions: catalog.filter((permission) => permission.endsWith('.view')),
      isDefault: true,
      position: 20,
    },
  ] as const

  return definitions.map((definition) => ({
    resourceType: APP_ROLE_PROVISIONING_RESOURCE_TYPE,
    key: `${appSlug}:${definition.key}`,
    position: definition.position,
    properties: [
      provisioningString('app-slug', appSlug),
      provisioningString('role-key', definition.key),
      provisioningString('name', definition.name),
      provisioningString('description', definition.description),
      provisioningString('permissions', definition.permissions.join(',')),
      {
        ...provisioningString('is-default', ''),
        valueType: 'boolean' as const,
        stringValue: null,
        booleanValue: definition.isDefault,
      },
      {
        ...provisioningString('is-system', ''),
        valueType: 'boolean' as const,
        stringValue: null,
        booleanValue: true,
      },
      {
        ...provisioningString('position', ''),
        valueType: 'integer' as const,
        stringValue: null,
        integerValue: definition.position,
      },
    ],
  }))
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
    minimumItems: STANDARD_ROLE_KEYS.length,
    maximumItems: null,
    fields: [
      field('app-slug', 'App slug', 'string', true),
      field('role-key', 'Role key', 'string', true),
      field('name', 'Name', 'string', true),
      field('description', 'Description', 'string', false),
      field('permissions', 'Permissions', 'string', true),
      field('is-default', 'Default role', 'boolean', true),
      field('is-system', 'System role', 'boolean', true),
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
  return new Map(
    resource.properties.map((property) => [property.key, property])
  )
}

function property(
  resource: ProvisioningResourceInput,
  key: string
): ProvisioningResourceInput['properties'][number] | undefined {
  const byKey = properties(resource)
  return byKey.get(key) ??
    (LEGACY_PROPERTY_KEYS[key] ? byKey.get(LEGACY_PROPERTY_KEYS[key]!) : undefined)
}

function readString(
  resource: ProvisioningResourceInput,
  key: string
): string | null {
  const item = property(resource, key)
  return item?.valueType === 'string' ? item.stringValue : null
}

function readBoolean(
  resource: ProvisioningResourceInput,
  key: string
): boolean | null {
  const item = property(resource, key)
  return item?.valueType === 'boolean' ? item.booleanValue : null
}

function readInteger(
  resource: ProvisioningResourceInput,
  key: string
): number | null {
  const item = property(resource, key)
  return item?.valueType === 'integer' ? item.integerValue : null
}

export function parseProvisioningPermissionList(
  value: string | null
): string[] {
  if (!value) return []
  return [
    ...new Set(
      value
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean)
    ),
  ].sort()
}

/** Converts provisioning property rows back to role-template domain values. */
export function parseAppRoleProvisioningResources(
  appSlug: string,
  resources: readonly ProvisioningResourceInput[]
): ProvisioningAppRoleTemplate[] {
  return resources
    .filter(isAppRoleResource)
    .map((resource) => ({
      key: canonicalRoleKey(readString(resource, 'role-key')) ?? '',
      name: readString(resource, 'name') ?? '',
      description: readString(resource, 'description'),
      permissions: parseProvisioningPermissionList(
        readString(resource, 'permissions')
      ),
      isDefault: readBoolean(resource, 'is-default') ?? false,
      isSystem: readBoolean(resource, 'is-system') ?? false,
      position: readInteger(resource, 'position') ?? 0,
    }))
    .filter(() => appSlug !== ENTERPRISE_APP_SLUG)
}

/**
 * Static validation for application-manifest app-role resources.
 * The generic provisioning validator still owns property type/cardinality
 * checks; this function owns app-access-specific identity/invariant checks.
 * Legacy underscore spellings are read-only aliases during the naming cutover;
 * builders and newly persisted manifests always emit canonical kebab-case.
 */
export function validateAppRoleProvisioningResources(
  appSlug: string,
  resources: readonly ProvisioningResourceInput[]
): ProvisioningValidationIssue[] {
  const issues: ProvisioningValidationIssue[] = []
  const roleResources = resources.filter(isAppRoleResource)

  if (appSlug === ENTERPRISE_APP_SLUG) {
    if (roleResources.length > 0)
      issues.push({
        path: 'resources',
        code: 'app-role-not-supported',
        message:
          '876 Enterprise is governed by organization roles and cannot declare app roles.',
      })
    return issues
  }

  if (roleResources.length === 0) {
    issues.push({
      path: 'resources',
      code: 'app-role-required',
      message: 'Application manifests must declare at least one app role.',
    })
    return issues
  }

  if (roleResources.length !== STANDARD_ROLE_KEYS.length)
    issues.push({
      path: 'resources',
      code: 'app-role-standard-shape',
      message:
        'Application manifests must declare exactly super-admin, admin, and staff roles.',
    })

  const roleKeys = new Set<string>()
  let defaultCount = 0

  roleResources.forEach((resource, index) => {
    const path = `resources.${index}`
    const declaredAppSlug = readString(resource, 'app-slug')
    const roleKey = canonicalRoleKey(readString(resource, 'role-key'))
    const name = readString(resource, 'name')
    const permissionValue = readString(resource, 'permissions')
    const isDefault = readBoolean(resource, 'is-default')
    const isSystem = readBoolean(resource, 'is-system')
    const position = readInteger(resource, 'position')

    if (declaredAppSlug !== appSlug)
      issues.push({
        path: `${path}.properties.app-slug`,
        code: 'app-role-app-mismatch',
        message: `App role must declare app-slug '${appSlug}'.`,
      })

    if (!roleKey || !ROLE_KEY.test(roleKey))
      issues.push({
        path: `${path}.properties.role-key`,
        code: 'app-role-key-invalid',
        message: 'Role key must use kebab-case lowercase letters and digits.',
      })
    else {
      if (roleKeys.has(roleKey))
        issues.push({
          path: `${path}.properties.role-key`,
          code: 'app-role-key-duplicate',
          message: `Role key '${roleKey}' is declared more than once.`,
        })
      roleKeys.add(roleKey)

      if (
        !STANDARD_ROLE_KEYS.includes(
          roleKey as (typeof STANDARD_ROLE_KEYS)[number]
        )
      )
        issues.push({
          path: `${path}.properties.role-key`,
          code: 'app-role-standard-key-required',
          message: `Role key must be one of: ${STANDARD_ROLE_KEYS.join(', ')}.`,
        })

      const canonicalResourceKey = `${appSlug}:${roleKey}`
      const legacyResourceKey =
        roleKey === 'super-admin' ? `${appSlug}:super_admin` : canonicalResourceKey
      if (
        resource.key !== canonicalResourceKey &&
        resource.key !== legacyResourceKey
      )
        issues.push({
          path: `${path}.key`,
          code: 'app-role-resource-key-invalid',
          message: `App role resource key must be '${canonicalResourceKey}'.`,
        })
    }

    if (!name?.trim())
      issues.push({
        path: `${path}.properties.name`,
        code: 'app-role-name-required',
        message: 'App role name is required.',
      })

    const permissions = parseProvisioningPermissionList(permissionValue)
    if (permissions.some((permission) => !PERMISSION_KEY.test(permission)))
      issues.push({
        path: `${path}.properties.permissions`,
        code: 'app-role-permission-invalid',
        message: 'Role permissions must use stable <module>.<action> keys.',
      })

    if (isDefault === null)
      issues.push({
        path: `${path}.properties.is-default`,
        code: 'app-role-default-required',
        message: 'is-default must be provided as a boolean.',
      })
    else if (isDefault) defaultCount += 1

    if (roleKey === 'staff' && isDefault !== true)
      issues.push({
        path: `${path}.properties.is-default`,
        code: 'app-role-staff-default-required',
        message: 'Staff must be the default application role.',
      })
    if (roleKey !== 'staff' && isDefault === true)
      issues.push({
        path: `${path}.properties.is-default`,
        code: 'app-role-default-invalid',
        message: 'Only Staff may be the default application role.',
      })

    if (isSystem === null)
      issues.push({
        path: `${path}.properties.is-system`,
        code: 'app-role-system-required',
        message: 'is-system must be provided as a boolean.',
      })
    else if (!isSystem)
      issues.push({
        path: `${path}.properties.is-system`,
        code: 'app-role-system-required',
        message: 'Standard application roles must be system roles.',
      })

    if (position === null)
      issues.push({
        path: `${path}.properties.position`,
        code: 'app-role-position-required',
        message: 'position must be provided as an integer.',
      })
  })

  if (defaultCount !== 1)
    issues.push({
      path: 'resources',
      code: 'app-role-default-count',
      message:
        'Application manifests must declare exactly one default app role.',
    })

  for (const roleKey of STANDARD_ROLE_KEYS)
    if (!roleKeys.has(roleKey))
      issues.push({
        path: 'resources',
        code: 'app-role-standard-key-missing',
        message: `Application manifest is missing the '${roleKey}' role.`,
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
    .filter(isAppRoleResource)
    .forEach((resource, index) => {
      const permissions = parseProvisioningPermissionList(
        readString(resource, 'permissions')
      )
      for (const permission of permissions) {
        if (!catalog.has(permission))
          issues.push({
            path: `resources.${index}.properties.permissions`,
            code: 'app-role-permission-unknown',
            message: `Permission '${permission}' is not registered for '${params.appSlug}'.`,
          })
      }

      const roleKey = canonicalRoleKey(readString(resource, 'role-key'))
      const expected =
        roleKey === 'super-admin'
          ? [...catalog]
          : roleKey === 'admin'
            ? [...catalog].filter(
                (permission) => !permission.endsWith('.delete')
              )
            : roleKey === 'staff'
              ? [...catalog].filter((permission) =>
                  permission.endsWith('.view')
                )
              : []
      if (
        STANDARD_ROLE_KEYS.includes(
          roleKey as (typeof STANDARD_ROLE_KEYS)[number]
        ) &&
        (permissions.length !== expected.length ||
          expected.some((permission) => !permissions.includes(permission)))
      )
        issues.push({
          path: `resources.${index}.properties.permissions`,
          code: 'app-role-permission-shape-invalid',
          message: `Role '${roleKey}' does not match the standard permission policy.`,
        })
    })

  return issues
}
