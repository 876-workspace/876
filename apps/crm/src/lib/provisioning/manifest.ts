import 'server-only'

import type { PlatformProvisioningProperty } from '@876/core/platform'

import { getPlatformClient } from '@/lib/clients/platform'
import { CRM_APP_SLUG } from '@/lib/crm-app'

export interface CrmProvisioningManifest {
  object: 'crm_provisioning_manifest'
  revision: number
  priorities: Array<{
    key: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    weight: number
    sortOrder: number
    isDefault: boolean
  }>
  categories: Array<{
    key: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
    defaultPriorityKey: string | null
  }>
  subcategories: Array<{
    key: string
    categoryKey: string
    name: string
    description: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
    defaultPriorityKey: string | null
  }>
}

type Properties = Map<string, PlatformProvisioningProperty>

function propertyMap(properties: PlatformProvisioningProperty[]): Properties {
  return new Map(properties.map((property) => [property.key, property]))
}

function required(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) throw new Error(`Missing CRM provisioning property: ${key}.`)
  return property
}

function stringValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type === 'string' && property.string_value !== null)
    return property.string_value
  if (property.value_type === 'reference' && property.reference_key)
    return property.reference_key
  throw new Error(`CRM provisioning property ${key} must be a string.`)
}

function optionalStringValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  return stringValue(properties, key)
}

function integerValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'integer' || property.integer_value === null)
    throw new Error(`CRM provisioning property ${key} must be an integer.`)
  const value = Number(property.integer_value)
  if (!Number.isSafeInteger(value))
    throw new Error(`CRM provisioning property ${key} exceeds a safe integer.`)
  return value
}

function booleanValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'boolean' || property.boolean_value === null)
    throw new Error(`CRM provisioning property ${key} must be a boolean.`)
  return property.boolean_value
}

export async function loadCrmProvisioningManifest(): Promise<CrmProvisioningManifest> {
  const platform = await getPlatformClient()
  const result = await platform.provisioning.retrievePublished(
    'application',
    CRM_APP_SLUG
  )
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'CRM provisioning configuration is missing.'
    )

  const profile = result.data
  const priorities = profile.resources
    .filter((resource) => resource.resource_type === 'request_priority')
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        color: optionalStringValue(values, 'color'),
        icon: optionalStringValue(values, 'icon'),
        weight: integerValue(values, 'weight'),
        sortOrder: integerValue(values, 'sortOrder'),
        isDefault: booleanValue(values, 'isDefault'),
      }
    })
  const categories = profile.resources
    .filter((resource) => resource.resource_type === 'request_category')
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        color: optionalStringValue(values, 'color'),
        icon: optionalStringValue(values, 'icon'),
        sortOrder: integerValue(values, 'sortOrder'),
        isActive: booleanValue(values, 'isActive'),
        defaultPriorityKey: optionalStringValue(values, 'defaultPriority'),
      }
    })
  const subcategories = profile.resources
    .filter((resource) => resource.resource_type === 'request_subcategory')
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        categoryKey: stringValue(values, 'category'),
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        icon: optionalStringValue(values, 'icon'),
        sortOrder: integerValue(values, 'sortOrder'),
        isActive: booleanValue(values, 'isActive'),
        defaultPriorityKey: optionalStringValue(values, 'defaultPriority'),
      }
    })

  if (priorities.length === 0 || categories.length === 0)
    throw new Error(
      'CRM provisioning requires request priorities and request categories.'
    )
  if (priorities.filter((priority) => priority.isDefault).length !== 1)
    throw new Error('CRM provisioning requires exactly one default priority.')

  return {
    object: 'crm_provisioning_manifest',
    revision: profile.revision,
    priorities,
    categories,
    subcategories,
  }
}
