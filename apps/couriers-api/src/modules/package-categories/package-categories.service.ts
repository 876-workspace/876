import { getError } from '@876/core'

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
} from '@/platform/timestamps'

import * as repo from './package-categories.repository'
import type {
  CreatePackageCategoryBody,
  ListPackageCategoriesQuery,
  PackageCategory,
  ProvisionedPackageCategory,
  UpdatePackageCategoryBody,
} from './package-categories.schemas'

type CategoryRow = NonNullable<
  Awaited<ReturnType<typeof repo.findTenantPackageCategoryById>>
>

export async function listPackageCategories(
  tenantId: string,
  query: ListPackageCategoriesQuery
) {
  const rows = await repo.listTenantPackageCategories({ tenantId, query })
  const page = rows.slice(0, query.limit)

  return {
    data: page.map(serialize),
    hasMore: rows.length > query.limit,
  }
}

export async function retrievePackageCategory(tenantId: string, id: string) {
  const row = await repo.findTenantPackageCategoryById(tenantId, id)
  return row ? serialize(row) : getError('package-category/not-found')
}

export async function createPackageCategory(
  tenantId: string,
  input: CreatePackageCategoryBody
) {
  const conflict = await repo.findTenantPackageCategoryBySlug(
    tenantId,
    input.slug
  )
  if (conflict) return getError('package-category/slug-conflict')

  return serialize(
    await repo.createTenantPackageCategory({
      tenantId,
      input,
      now: nowUnixSeconds(),
    })
  )
}

export async function updatePackageCategory(
  tenantId: string,
  id: string,
  input: UpdatePackageCategoryBody
) {
  const current = await repo.findTenantPackageCategoryById(tenantId, id)
  if (!current) return getError('package-category/not-found')

  if (input.slug !== undefined && input.slug !== current.slug) {
    const conflict = await repo.findTenantPackageCategoryBySlug(
      tenantId,
      input.slug,
      id
    )
    if (conflict) return getError('package-category/slug-conflict')
  }

  return serialize(
    await repo.updateTenantPackageCategory({
      id,
      input,
      now: nowUnixSeconds(),
    })
  )
}

export async function deletePackageCategory(tenantId: string, id: string) {
  const current = await repo.findTenantPackageCategoryById(tenantId, id)
  if (!current) return getError('package-category/not-found')

  await repo.archiveTenantPackageCategory({ id, now: nowUnixSeconds() })

  return { object: 'package_category' as const, id, deleted: true as const }
}

export async function requireActivePackageCategory(
  tenantId: string,
  id: string
) {
  const category = await repo.findTenantPackageCategoryById(tenantId, id)
  if (!category) return getError('package-category/not-found')
  if (!category.isActive) return getError('package-category/inactive')

  return category
}

export async function reconcileProvisionedPackageCategories(
  tenantId: string,
  inputs: readonly ProvisionedPackageCategory[]
) {
  const now = nowUnixSeconds()

  for (const input of inputs) {
    const provisioned = await repo.findTenantPackageCategoryByProvisioningKey(
      tenantId,
      input.key
    )
    if (provisioned) continue

    const sameSlug = await repo.findTenantPackageCategoryBySlug(
      tenantId,
      input.key
    )
    if (sameSlug) {
      if (sameSlug.provisioningKey)
        return getError('package-category/provisioning-key-conflict')

      await repo.adoptProvisionedPackageCategory({
        id: sameSlug.id,
        provisioningKey: input.key,
        now,
      })
      continue
    }

    await repo.createProvisionedPackageCategory({ tenantId, input, now })
  }

  return { reconciled: inputs.length }
}

function serialize(row: CategoryRow): PackageCategory {
  return {
    object: 'package_category',
    id: row.id,
    tenant_id: row.tenantId,
    provisioning_key: row.provisioningKey,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
  }
}
