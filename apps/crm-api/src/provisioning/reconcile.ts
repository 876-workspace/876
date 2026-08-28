import { crmError } from '../http/errors.js'
import type { CrmProvisioningManifest } from '../types/provisioning.js'
import * as categories from '../modules/categories/index.js'
import * as priorities from '../modules/priorities/index.js'

export async function reconcileCrmProvisioning(
  tenantId: string,
  manifest: CrmProvisioningManifest
) {
  const priorityIds = new Map<string, string>()
  for (const priority of manifest.priorities) {
    const row = await priorities.ensureProvisioned(tenantId, {
      provisioningKey: priority.key,
      name: priority.name,
      description: priority.description,
      color: priority.color,
      icon: priority.icon,
      weight: priority.weight,
      sortOrder: priority.sortOrder,
      isDefault: priority.isDefault,
    })
    priorityIds.set(priority.key, row.id)
  }

  const categoryIds = new Map<string, string>()
  for (const category of manifest.categories) {
    const defaultPriorityId = category.defaultPriorityKey
      ? priorityIds.get(category.defaultPriorityKey)
      : null
    if (category.defaultPriorityKey && !defaultPriorityId)
      throw crmError('crm/provisioning-invalid')

    const row = await categories.ensureProvisionedCategory(tenantId, {
      provisioningKey: category.key,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      defaultPriorityId: defaultPriorityId ?? null,
    })
    categoryIds.set(category.key, row.id)
  }

  for (const subcategory of manifest.subcategories) {
    const categoryId = categoryIds.get(subcategory.categoryKey)
    const defaultPriorityId = subcategory.defaultPriorityKey
      ? priorityIds.get(subcategory.defaultPriorityKey)
      : null
    if (!categoryId || (subcategory.defaultPriorityKey && !defaultPriorityId))
      throw crmError('crm/provisioning-invalid')

    await categories.ensureProvisionedSubcategory(tenantId, {
      provisioningKey: subcategory.key,
      categoryId,
      name: subcategory.name,
      description: subcategory.description,
      color: null,
      icon: subcategory.icon,
      sortOrder: subcategory.sortOrder,
      isActive: subcategory.isActive,
      defaultPriorityId: defaultPriorityId ?? null,
    })
  }
}
