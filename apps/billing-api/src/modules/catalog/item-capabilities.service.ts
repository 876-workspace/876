import { appError } from '@/http/errors'

import { itemPreferences } from './repositories/item-preferences'

export interface ItemCapabilities {
  variantsEnabled: boolean
}

/** Resolves organization-controlled Item capabilities from canonical preferences. */
export async function resolveItemCapabilities(
  tenantId: string
): Promise<ItemCapabilities> {
  const preferences = await itemPreferences.retrieve(tenantId)
  return { variantsEnabled: preferences.productVariants }
}

export async function requireItemVariantsEnabled(tenantId: string) {
  const capabilities = await resolveItemCapabilities(tenantId)
  if (!capabilities.variantsEnabled)
    throw appError('billing/item-variants-disabled')
  return capabilities
}
