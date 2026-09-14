import 'server-only'

import type { PlatformProvisioningProperty } from '@876/core/platform'

import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { getPlatformClient } from '@/lib/services/platform'

export interface CouriersProvisioningManifest {
  object: 'couriers_provisioning_manifest'
  revision: number
  packageCategories: Array<{
    key: string
    name: string
    description: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
  }>
}

type Properties = Map<string, PlatformProvisioningProperty>

function propertyMap(properties: PlatformProvisioningProperty[]): Properties {
  return new Map(properties.map((property) => [property.key, property]))
}

function required(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property)
    throw new Error(`Missing Couriers provisioning property: ${key}.`)
  return property
}

function stringValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type === 'string' && property.string_value !== null)
    return property.string_value
  throw new Error(`Couriers provisioning property ${key} must be a string.`)
}

function optionalStringValue(properties: Properties, key: string) {
  const property = properties.get(key)
  if (!property) return null
  return stringValue(properties, key)
}

function integerValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'integer' || property.integer_value === null)
    throw new Error(`Couriers provisioning property ${key} must be an integer.`)
  const value = Number(property.integer_value)
  if (!Number.isSafeInteger(value))
    throw new Error(`Couriers provisioning property ${key} exceeds a safe integer.`)
  return value
}

function booleanValue(properties: Properties, key: string) {
  const property = required(properties, key)
  if (property.value_type !== 'boolean' || property.boolean_value === null)
    throw new Error(`Couriers provisioning property ${key} must be a boolean.`)
  return property.boolean_value
}

export async function loadCouriersProvisioningManifest(): Promise<CouriersProvisioningManifest> {
  const platform = await getPlatformClient()
  const result = await platform.provisioning.retrievePublished(
    'application',
    COURIERS_APP_SLUG
  )
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Couriers provisioning configuration is missing.'
    )

  const published = result.data
  const packageCategories = published.resources
    .filter((resource) => resource.resource_type === 'package_category')
    .map((resource) => {
      const values = propertyMap(resource.properties)
      return {
        key: resource.key,
        name: stringValue(values, 'name'),
        description: optionalStringValue(values, 'description'),
        icon: optionalStringValue(values, 'icon'),
        sortOrder: integerValue(values, 'sortOrder'),
        isActive: booleanValue(values, 'isActive'),
      }
    })

  if (packageCategories.length === 0)
    throw new Error(
      'Couriers provisioning requires at least one package category.'
    )

  return {
    object: 'couriers_provisioning_manifest',
    revision: published.revision,
    packageCategories,
  }
}
