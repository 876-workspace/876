import { listObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'

import type { ProvisioningDraftReplace } from './provisioning.schemas'
import type {
  ProvisioningSetupResourceCreate,
  ProvisioningSetupResourceUpdate,
} from './provisioning-resource.schemas'
import {
  replaceDraft,
  retrieveCatalog,
  retrieveManifest,
} from './provisioning.service'

type Revision = Awaited<ReturnType<typeof retrieveManifest>>['draft']
type Resource = NonNullable<Revision>['resources'][number]
type Catalog = Awaited<ReturnType<typeof retrieveCatalog>>
type ResourceDefinition = Catalog['resource_types'][number]

function resourceNotFound(resourceType: string, resourceKey?: string): never {
  throw new AppHttpError({
    code: 'provisioning/resource-not-found',
    message: resourceKey
      ? `Provisioning resource '${resourceType}/${resourceKey}' was not found.`
      : `Provisioning resource type '${resourceType}' was not found.`,
    httpStatus: 404,
  })
}

async function resourceDefinition(
  setupKey: string,
  resourceType: string
): Promise<ResourceDefinition> {
  const catalog = await retrieveCatalog('finance', setupKey)
  const definition = catalog.resource_types.find(
    (candidate) => candidate.resource_type === resourceType
  )
  if (!definition) return resourceNotFound(resourceType)
  return definition
}

function revisionAsDraft(revision: NonNullable<Revision>): ProvisioningDraftReplace {
  return {
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: revision.finance_dependency,
    finance_scopes: revision.finance_scopes,
    resources: revision.resources.map((resource) => ({
      resource_type: resource.resource_type,
      key: resource.key,
      position: resource.position,
      properties: resource.properties.map((property) => ({
        key: property.key,
        value_type: property.value_type,
        string_value: property.string_value,
        integer_value:
          property.integer_value === null
            ? null
            : Number(property.integer_value),
        decimal_value: property.decimal_value,
        boolean_value: property.boolean_value,
        reference_namespace: property.reference_namespace,
        reference_key: property.reference_key,
      })),
    })),
    steps: revision.steps.map((step) => ({
      key: step.key,
      description: step.description,
      position: step.position,
    })),
  }
}

async function editableDraft(setupKey: string): Promise<ProvisioningDraftReplace> {
  const manifest = await retrieveManifest('finance', setupKey)
  const revision = manifest.draft ?? manifest.published

  if (revision) return revisionAsDraft(revision)

  return {
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: 'none',
    finance_scopes: [],
    resources: [],
    steps: [],
  }
}

function nextPosition(resources: ProvisioningDraftReplace['resources']): number {
  return resources.reduce((max, resource) => Math.max(max, resource.position), 0) + 10
}

function ensurePositionAvailable(
  resources: ProvisioningDraftReplace['resources'],
  position: number,
  except?: { resourceType: string; resourceKey: string }
) {
  const conflict = resources.find(
    (resource) =>
      resource.position === position &&
      !(
        except &&
        resource.resource_type === except.resourceType &&
        resource.key === except.resourceKey
      )
  )
  if (!conflict) return

  throw new AppHttpError({
    code: 'provisioning/resource-position-taken',
    message: `Provisioning resource position ${position} is already in use.`,
    httpStatus: 409,
  })
}

function responseResource(
  revision: Awaited<ReturnType<typeof replaceDraft>>,
  resourceType: string,
  resourceKey: string
): Resource {
  const resource = revision.resources.find(
    (candidate) =>
      candidate.resource_type === resourceType && candidate.key === resourceKey
  )
  if (!resource) return resourceNotFound(resourceType, resourceKey)
  return resource
}

export async function listSetupResources(
  setupKey: string,
  resourceType: string
) {
  await resourceDefinition(setupKey, resourceType)
  const manifest = await retrieveManifest('finance', setupKey)
  const revision = manifest.draft ?? manifest.published
  const data = (revision?.resources ?? []).filter(
    (resource) => resource.resource_type === resourceType
  )

  return listObject({
    data,
    hasMore: false,
    url: `/provisioning/setups/${encodeURIComponent(setupKey)}/resources/${encodeURIComponent(resourceType)}`,
    totalCount: data.length,
  })
}

export async function retrieveSetupResource(
  setupKey: string,
  resourceType: string,
  resourceKey: string
): Promise<Resource> {
  const result = await listSetupResources(setupKey, resourceType)
  const resource = result.data.find((candidate) => candidate.key === resourceKey)
  if (!resource) return resourceNotFound(resourceType, resourceKey)
  return resource
}

export async function createSetupResource(
  setupKey: string,
  resourceType: string,
  body: ProvisioningSetupResourceCreate
): Promise<Resource> {
  const definition = await resourceDefinition(setupKey, resourceType)
  const draft = await editableDraft(setupKey)
  const sameType = draft.resources.filter(
    (resource) => resource.resource_type === resourceType
  )

  if (sameType.some((resource) => resource.key === body.key)) {
    throw new AppHttpError({
      code: 'provisioning/resource-key-taken',
      message: `Provisioning resource '${resourceType}/${body.key}' already exists.`,
      httpStatus: 409,
    })
  }

  if (!definition.multiple && sameType.length > 0) {
    throw new AppHttpError({
      code: 'provisioning/resource-cardinality',
      message: `Provisioning resource type '${resourceType}' permits only one row.`,
      httpStatus: 409,
    })
  }

  if (
    definition.maximum_items !== null &&
    sameType.length >= definition.maximum_items
  ) {
    throw new AppHttpError({
      code: 'provisioning/resource-maximum',
      message: `Provisioning resource type '${resourceType}' permits at most ${definition.maximum_items} row(s).`,
      httpStatus: 409,
    })
  }

  const position = body.position ?? nextPosition(draft.resources)
  ensurePositionAvailable(draft.resources, position)

  const saved = await replaceDraft('finance', setupKey, {
    ...draft,
    resources: [
      ...draft.resources,
      {
        resource_type: resourceType,
        key: body.key,
        position,
        properties: body.properties,
      },
    ],
  })

  return responseResource(saved, resourceType, body.key)
}

export async function updateSetupResource(
  setupKey: string,
  resourceType: string,
  resourceKey: string,
  body: ProvisioningSetupResourceUpdate
): Promise<Resource> {
  await resourceDefinition(setupKey, resourceType)
  const draft = await editableDraft(setupKey)
  const index = draft.resources.findIndex(
    (resource) =>
      resource.resource_type === resourceType && resource.key === resourceKey
  )
  if (index < 0) return resourceNotFound(resourceType, resourceKey)

  const current = draft.resources[index]!
  const position = body.position ?? current.position
  ensurePositionAvailable(draft.resources, position, {
    resourceType,
    resourceKey,
  })

  const resources = [...draft.resources]
  resources[index] = {
    ...current,
    position,
    properties: body.properties ?? current.properties,
  }

  const saved = await replaceDraft('finance', setupKey, {
    ...draft,
    resources,
  })

  return responseResource(saved, resourceType, resourceKey)
}

export async function deleteSetupResource(
  setupKey: string,
  resourceType: string,
  resourceKey: string
) {
  const definition = await resourceDefinition(setupKey, resourceType)
  const draft = await editableDraft(setupKey)
  const existing = draft.resources.find(
    (resource) =>
      resource.resource_type === resourceType && resource.key === resourceKey
  )
  if (!existing) return resourceNotFound(resourceType, resourceKey)

  const sameType = draft.resources.filter(
    (resource) => resource.resource_type === resourceType
  )
  if (sameType.length <= definition.minimum_items) {
    throw new AppHttpError({
      code: 'provisioning/resource-minimum',
      message: `Provisioning resource type '${resourceType}' requires at least ${definition.minimum_items} row(s).`,
      httpStatus: 409,
    })
  }

  const referencing = draft.resources.find((resource) =>
    resource.properties.some(
      (property) =>
        property.reference_namespace === resourceType &&
        property.reference_key === resourceKey
    )
  )
  if (referencing) {
    throw new AppHttpError({
      code: 'provisioning/resource-in-use',
      message: `Provisioning resource '${resourceType}/${resourceKey}' is referenced by '${referencing.resource_type}/${referencing.key}'.`,
      httpStatus: 409,
    })
  }

  await replaceDraft('finance', setupKey, {
    ...draft,
    resources: draft.resources.filter(
      (resource) =>
        !(
          resource.resource_type === resourceType && resource.key === resourceKey
        )
    ),
  })

  return {
    object: 'provisioning_resource' as const,
    resource_type: resourceType,
    key: resourceKey,
    deleted: true as const,
  }
}
