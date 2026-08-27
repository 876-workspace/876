import { crmError } from '../../http/errors.js'
import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  UpdateCategoryInput,
} from '../../types/category.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './categories.repository.js'

type CategoryRow = Awaited<ReturnType<typeof repository.list>>[number]
type SubcategoryRow = NonNullable<
  Awaited<ReturnType<typeof repository.retrieveSub>>
>

/** Derives the stable URL-safe identifier used for categories and subcategories. */
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

/** Lists every visible category and its visible subcategories for a tenant. */
export async function list(organizationId: string) {
  const tenant = await requireTenant(organizationId)

  const categories = await repository.list(tenant.id)

  return categories.map(serializeCategory)
}

/** Retrieves one visible category with its visible subcategories. */
export async function retrieve(organizationId: string, categoryId: string) {
  const tenant = await requireTenant(organizationId)

  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) return null

  return serializeCategory(category)
}

/** Creates a category with a stable slug derived from its display name. */
export async function create(
  organizationId: string,
  input: CreateCategoryInput
) {
  const tenant = await requireTenant(organizationId)

  const category = await repository.create({
    tenantId: tenant.id,
    ...input,
    slug: slugify(input.name),
  })

  return serializeCategory(category)
}

/** Updates an existing visible category while preserving tenant ownership. */
export async function update(
  organizationId: string,
  categoryId: string,
  input: UpdateCategoryInput
) {
  const tenant = await requireTenant(organizationId)

  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) return null

  const updatedCategory = await repository.update(categoryId, input)

  return serializeCategory(updatedCategory)
}

/** Refuses in-use deletion because categories are a reporting dimension whose history must remain intact; archive them instead. */
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

/** Creates a subcategory beneath an existing visible category. */
export async function createSub(
  organizationId: string,
  categoryId: string,
  input: CreateCategoryInput
) {
  const tenant = await requireTenant(organizationId)

  const category = await repository.retrieve(tenant.id, categoryId)
  if (!category) throw crmError('crm/category-not-found')

  const subcategory = await repository.createSub({
    tenantId: tenant.id,
    categoryId,
    ...input,
    slug: slugify(input.name),
  })

  return serializeSubcategory(subcategory)
}

/** Updates one visible subcategory within its parent category. */
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

  const updatedSubcategory = await repository.updateSub(subcategoryId, input)

  return serializeSubcategory(updatedSubcategory)
}

/** Refuses in-use deletion so a request's historical reporting dimension remains intact. */
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
