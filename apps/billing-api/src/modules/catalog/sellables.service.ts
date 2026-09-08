import type {
  ResolvedSellable,
  SellableReference,
} from '@/types/commerce'

import { loadSellables } from './sellables.repository'

type SellableResolutionError = {
  data: null
  error: string
  status: number
  code: string
}

type SellableResolutionResult<T> =
  | { data: T; error: null }
  | SellableResolutionError

export function sellableKey(reference: SellableReference): string {
  return `${reference.itemId}:${reference.variantId ?? ''}`
}

function failure(
  error: string,
  status: number,
  code: string
): SellableResolutionError {
  return { data: null, error, status, code }
}

/**
 * Resolves Variant-only legacy/document selections to canonical references.
 * Canonical callers should already carry both Item and Variant ids.
 */
export async function resolveVariantReferences(
  tenantId: string,
  variantIds: readonly string[]
): Promise<SellableResolutionResult<Map<string, SellableReference>>> {
  const uniqueIds = [...new Set(variantIds)]
  if (uniqueIds.length === 0) return { data: new Map(), error: null }

  const [, variants] = await loadSellables(tenantId, [], uniqueIds)
  if (variants.length !== uniqueIds.length)
    return failure(
      'One or more selected item variants were not found.',
      404,
      'billing/item-variant-not-found'
    )

  return {
    data: new Map(
      variants.map((variant) => [
        variant.id,
        { itemId: variant.itemId, variantId: variant.id },
      ])
    ),
    error: null,
  }
}

/**
 * Resolves tenant-owned Item/Variant selections without leaking catalogue row
 * structure into consuming workflows.
 */
export async function resolveSellables(
  tenantId: string,
  references: readonly SellableReference[]
): Promise<SellableResolutionResult<Map<string, ResolvedSellable>>> {
  const unique = new Map(
    references.map((reference) => [sellableKey(reference), reference])
  )
  if (unique.size === 0) return { data: new Map(), error: null }

  const itemIds = [...new Set([...unique.values()].map((entry) => entry.itemId))]
  const variantIds = [
    ...new Set(
      [...unique.values()].flatMap((entry) =>
        entry.variantId ? [entry.variantId] : []
      )
    ),
  ]
  const [items, variants] = await loadSellables(tenantId, itemIds, variantIds)
  const itemById = new Map(items.map((item) => [item.id, item]))
  const variantById = new Map(variants.map((variant) => [variant.id, variant]))
  const resolved = new Map<string, ResolvedSellable>()

  for (const reference of unique.values()) {
    const item = itemById.get(reference.itemId)
    if (!item)
      return failure(
        'One or more selected items were not found.',
        404,
        'item/not-found'
      )

    const variant = reference.variantId
      ? variantById.get(reference.variantId)
      : null
    if (reference.variantId && (!variant || variant.itemId !== item.id))
      return failure(
        'The selected item variant does not belong to this item.',
        409,
        'billing/item-variant-not-found'
      )
    if (item.variantMode === 'variant' && !variant)
      return failure(
        'Choose a variant for each variant-based item.',
        409,
        'billing/item-variant-required'
      )
    if (variant && item.variantMode !== 'variant')
      return failure(
        'The selected item does not use variants.',
        409,
        'billing/item-variant-not-found'
      )

    const defaultSellingAmount =
      variant?.defaultSellingAmount ?? item.defaultSellingAmount
    const defaultSellingCurrency =
      variant?.defaultSellingAmount !== null &&
      variant?.defaultSellingAmount !== undefined
        ? variant.defaultSellingCurrency
        : item.defaultSellingCurrency
    const stockTarget =
      item.type !== 'GOOD' || !item.trackStock
        ? null
        : variant
          ? ({ type: 'variant', id: variant.id } as const)
          : ({ type: 'item', id: item.id } as const)

    resolved.set(sellableKey(reference), {
      reference,
      identity: {
        name: item.name,
        variantName: variant?.name ?? null,
        sku: variant ? variant.sku : item.sku,
      },
      type: item.type,
      unit: item.unit,
      taxable: item.isTaxable,
      taxCode: item.taxCode,
      defaultSellingAmount,
      defaultSellingCurrency,
      pricingReference: reference,
      stockTarget,
      primaryFileId: variant?.media[0]?.fileId ?? item.media[0]?.fileId ?? null,
    })
  }

  return { data: resolved, error: null }
}

export async function resolveSellable(
  tenantId: string,
  reference: SellableReference
): Promise<SellableResolutionResult<ResolvedSellable>> {
  const result = await resolveSellables(tenantId, [reference])
  if (result.error !== null) return result

  const sellable = result.data.get(sellableKey(reference))
  return sellable
    ? { data: sellable, error: null }
    : failure('The selected item was not found.', 404, 'item/not-found')
}
