import { crmError } from '../../http/errors.js'
import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  ProvisionedCategoryInput,
  ProvisionedSubcategoryInput,
  UpdateCategoryInput,
} from '../../types/category.js'
import * as priorities from '../priorities/index.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './categories.repository.js'

type CategoryRow = Awaited<ReturnType<typeof repository.list>>[number]
type SubcategoryRow = NonNullable<
  Awaited<ReturnType<typeof repository.retrieveSub>>
>

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'category'
  )
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) throw crmError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') throw crmError('crm/tenant-inactive')

  return tenant
}

function serializeSubcategory(subcategoryRow: SubcategoryRow) {
  return {
    object: 'request_subcategory' as const,
    ...subcategoryRow,
    createdAt: Math.floor(subcategoryRow.createdAt.getTime() / 1000),
    updatedAt: Math.floor(subcategoryRow.updatedAt.getTime() / 1000),
  }
}

function serializeCategory(categoryRow: CategoryRow) {
  return {
    object: 'request_category' as const,
    ...categoryRow,
    createdAt: Math.floor(categoryRow.createdAt.getTime() / 1000),
    updatedAt: Math.floor(categoryRow.updatedAt.getTime() / 1000),
    subcategories: categoryRow.subcategories.map(serializeSubcategory),
  }
}

async function validateDefaultPriority(
  tenantId: string,
  defaultPriorityId: string | null | undefined
) {
  if (defaultPriorityId)
    await priorities.requireActiveForTenant(tenantId, defaultPriorityId)
}

export async function list(organizationId: string) {
  const tenant = await requireTenant(organizationId)
  return (await repository.list(tenant.id)).map(serializeCategory)
}

export async function retrieve(organizationId: string, categoryId: string) {
  const tenant = await requireTenant(organizationId)
  const category = await repository.retrieve(tenant.id, categoryId)

  return category ? serializeCategory(category) : null
}

export async function create(
  organizationId: string,
  input: CreateCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  await validateDefaultPriority(tenant.id, input.defaultPriorityId)
  const category = await repository.create({
    tenantId: tenant.id,
    ...input,
    slug: slugify(input.name),
  })

  return serializeCategory(category)
}

export async function update(
  organizationId: string,
  categoryId: string,
  input: UpdateCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) return null

  await validateDefaultPriority(tenant.id, input.defaultPriorityId)
  const updatedCategory = await repository.update(categoryId, {
    ...input,
    ...(input.name === undefined ? {} : { slug: slugify(input.name) }),
  })

  return serializeCategory(updatedCategory)
}

export async function remove(
  organizationId: string,
  categoryId: string,
  input: DeleteCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) return null
  if (await repository.used(tenant.id, categoryId))
    throw crmError('crm/category-in-use')

  return repository.remove({ id: categoryId, ...input })
}

export async function createSub(
  organizationId: string,
  categoryId: string,
  input: CreateCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) throw crmError('crm/category-not-found')

  await validateDefaultPriority(tenant.id, input.defaultPriorityId)
  return serializeSubcategory(
    await repository.createSub({
      tenantId: tenant.id,
      categoryId,
      ...input,
      slug: slugify(input.name),
    })
  )
}

export async function updateSub(
  organizationId: string,
  categoryId: string,
  subcategoryId: string,
  input: UpdateCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  const subcategory = await repository.retrieveSub(
    tenant.id,
    categoryId,
    subcategoryId
  )
  if (!subcategory) return null

  await validateDefaultPriority(tenant.id, input.defaultPriorityId)
  return serializeSubcategory(
    await repository.updateSub(subcategoryId, {
      ...input,
      ...(input.name === undefined ? {} : { slug: slugify(input.name) }),
    })
  )
}

export async function removeSub(
  organizationId: string,
  categoryId: string,
  subcategoryId: string,
  input: DeleteCategoryInput
) {
  const tenant = await requireTenant(organizationId)
  const subcategory = await repository.retrieveSub(
    tenant.id,
    categoryId,
    subcategoryId
  )
  if (!subcategory) return null
  if (await repository.usedSub(tenant.id, subcategoryId))
    throw crmError('crm/subcategory-in-use')

  return repository.removeSub({ id: subcategoryId, ...input })
}

export async function ensureProvisionedCategory(
  tenantId: string,
  input: ProvisionedCategoryInput
) {
  const existing = await repository.retrieveByProvisioningKey(
    tenantId,
    input.provisioningKey
  )
  if (existing) return existing

  return repository.create({
    tenantId,
    provisioningKey: input.provisioningKey,
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    color: input.color,
    icon: input.icon,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    defaultPriorityId: input.defaultPriorityId,
    createdBy: null,
  })
}

export async function ensureProvisionedSubcategory(
  tenantId: string,
  input: ProvisionedSubcategoryInput
) {
  const existing = await repository.retrieveSubByProvisioningKey(
    tenantId,
    input.provisioningKey
  )
  if (existing) return existing

  return repository.createSub({
    tenantId,
    categoryId: input.categoryId,
    provisioningKey: input.provisioningKey,
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    icon: input.icon,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    defaultPriorityId: input.defaultPriorityId,
    createdBy: null,
  })
}
