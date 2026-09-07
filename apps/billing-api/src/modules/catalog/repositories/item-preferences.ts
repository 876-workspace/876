import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { ItemPreferencesResource } from '../schemas/item-preference'

const MODULE = 'items'
const PRODUCT_VARIANTS = 'product-variants'

/** Resolves Item preferences. Missing override rows mean the catalog default. */
export async function retrieve(
  tenantId: string
): Promise<ItemPreferencesResource> {
  const row = await prisma.modulePreference.findFirst({
    where: { tenantId, module: MODULE, key: PRODUCT_VARIANTS },
    select: { booleanValue: true },
  })

  return {
    object: 'item_preferences',
    productVariants: row?.booleanValue ?? false,
  }
}

/** Stores only non-default overrides; false removes the row and falls back to default. */
export async function update(
  tenantId: string,
  productVariants: boolean,
  updatedBy?: string
): Promise<ItemPreferencesResource> {
  if (!productVariants) {
    await prisma.modulePreference.deleteMany({
      where: { tenantId, module: MODULE, key: PRODUCT_VARIANTS },
    })
    return { object: 'item_preferences', productVariants: false }
  }

  const now = nowUnixSeconds()
  await prisma.modulePreference.upsert({
    where: {
      billing_module_preferences_tenant_module_key: {
        tenantId,
        module: MODULE,
        key: PRODUCT_VARIANTS,
      },
    },
    create: {
      id: generateId('ModulePreference'),
      tenantId,
      module: MODULE,
      key: PRODUCT_VARIANTS,
      valueType: 'boolean',
      booleanValue: true,
      updatedBy: updatedBy ?? null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      valueType: 'boolean',
      stringValue: null,
      integerValue: null,
      decimalValue: null,
      booleanValue: true,
      referenceNamespace: null,
      referenceKey: null,
      updatedBy: updatedBy ?? null,
      updatedAt: now,
    },
  })

  return { object: 'item_preferences', productVariants: true }
}

export const itemPreferences = { retrieve, update }
