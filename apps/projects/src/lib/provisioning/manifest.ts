import 'server-only'

import type { PlatformProvisioningProperty } from '@876/core/platform'

import { getPlatformClient } from '@/lib/clients/platform'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'

/**
 * The shape of a published 876 Projects provisioning profile.
 *
 * Provisioning answers "what must exist before the app works?" and is a
 * published, versioned platform contract — distinct from module state, which an
 * org admin controls at runtime (`.claude/rules/module-settings.md`). This
 * module defines and validates the contract; it does not publish a profile, and
 * no profile data ships with the app.
 */
import type { ProjectsProvisioningManifest } from '@/types/provisioning'

type Properties = Map<string, PlatformProvisioningProperty>

function propertyMap(properties: PlatformProvisioningProperty[]): Properties {
  return new Map(properties.map((property) => [property.key, property]))
}

function required(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property)
    throw new Error(`Missing Projects provisioning property: ${key}.`)
  return property
}

function stringValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type === 'string' && property.string_value !== null)
    return property.string_value
  if (property.value_type === 'reference' && property.reference_key)
    return property.reference_key
  throw new Error(`Projects provisioning property ${key} must be a string.`)
}

function optionalStringValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  return stringValue(properties, key)
}

function integerValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'integer' || property.integer_value === null)
    throw new Error(`Projects provisioning property ${key} must be an integer.`)
  const value = Number(property.integer_value)
  if (!Number.isSafeInteger(value))
    throw new Error(
      `Projects provisioning property ${key} exceeds a safe integer.`
    )
  return value
}

function booleanValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'boolean' || property.boolean_value === null)
    throw new Error(`Projects provisioning property ${key} must be a boolean.`)
  return property.boolean_value
}

export async function loadProjectsProvisioningManifest(): Promise<ProjectsProvisioningManifest> {
  const platform = await getPlatformClient()
  const result = await platform.provisioning.retrievePublished(
    'application',
    PROJECTS_APP_SLUG
  )
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Projects provisioning configuration is missing.'
    )

  const profile = result.data
  const labels = profile.resources
    .filter((resource) => resource.resource_type === 'projects_label')
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        name: stringValue(values, 'name'),
        color: optionalStringValue(values, 'color'),
        description: optionalStringValue(values, 'description'),
        sortOrder: integerValue(values, 'sortOrder'),
      }
    })

  const projectTemplates = profile.resources
    .filter(
      (resource) => resource.resource_type === 'projects_project_template'
    )
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        name: stringValue(values, 'name'),
        projectKey: stringValue(values, 'projectKey'),
        description: optionalStringValue(values, 'description'),
        sortOrder: integerValue(values, 'sortOrder'),
        isDefault: booleanValue(values, 'isDefault'),
      }
    })

  if (projectTemplates.filter((template) => template.isDefault).length > 1)
    throw new Error(
      'Projects provisioning allows at most one default project template.'
    )

  return {
    object: 'projects-provisioning-manifest',
    revision: profile.revision,
    labels,
    projectTemplates,
  }
}
