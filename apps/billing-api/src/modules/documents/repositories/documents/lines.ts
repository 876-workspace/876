import {
  calculateDocumentTotals,
  type DocumentLineAmounts,
} from '@876/core/money'

import { prisma } from '@/db/client'
import type { DocumentLineCreateParams } from '../../schemas/document-line'

import { applyPercentageAdjustment, calculateCatalogAmount } from '../pricing'

type PreparedDocumentLine = {
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  description: string
  unit: string | null
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
}

type BuildLinesResult =
  | {
      data: {
        lines: PreparedDocumentLine[]
        /**
         * The per-line amounts in the shape `calculateDocumentTotals` takes, so
         * a caller applying document-level discount/shipping/adjustment rolls
         * the document up with the same function rather than a second copy.
         */
        lineAmounts: DocumentLineAmounts[]
        subtotalAmount: bigint
        taxAmount: bigint
        totalAmount: bigint
        priceList: { id: string; name: string } | null
      }
      error: null
    }
  | { data: null; error: string }

/** Resolves immutable document-line snapshots from tenant-owned catalogue data. */
export async function buildDocumentLines(
  tenantId: string,
  currency: string,
  params: DocumentLineCreateParams[],
  priceListId?: string | null
): Promise<BuildLinesResult> {
  const itemIds = [
    ...new Set(params.flatMap((line) => (line.itemId ? [line.itemId] : []))),
  ]
  const variantIds = [
    ...new Set(
      params.flatMap((line) => (line.variantId ? [line.variantId] : []))
    ),
  ]
  const priceIds = [
    ...new Set(params.flatMap((line) => (line.priceId ? [line.priceId] : []))),
  ]

  const [items, variants, prices, priceList] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: itemIds }, tenantId, isActive: true },
    }),
    prisma.itemVariant.findMany({
      where: {
        id: { in: variantIds },
        tenantId,
        isActive: true,
        item: { tenantId, isActive: true, variantMode: 'variant' },
      },
      include: { item: true },
    }),
    prisma.price.findMany({
      where: { id: { in: priceIds }, tenantId, isActive: true },
      include: {
        item: true,
        plan: { include: { product: true } },
        addon: { include: { product: true } },
        tiers: { orderBy: { fromUnit: 'asc' } },
      },
    }),
    priceListId
      ? prisma.priceList.findFirst({
          where: { id: priceListId, tenantId, isActive: true },
          include: {
            entries: {
              where: { priceId: { in: priceIds } },
              include: { tiers: { orderBy: { fromUnit: 'asc' } } },
            },
          },
        })
      : null,
  ])
  if (items.length !== itemIds.length)
    return { data: null, error: 'One or more selected items were not found.' }
  if (variants.length !== variantIds.length)
    return { data: null, error: 'One or more selected item variants were not found.' }
  if (prices.length !== priceIds.length)
    return { data: null, error: 'One or more selected prices were not found.' }
  if (priceListId && !priceList)
    return { data: null, error: 'The selected price list was not found.' }

  const itemById = new Map(items.map((item) => [item.id, item]))
  const variantById = new Map(variants.map((variant) => [variant.id, variant]))
  const priceById = new Map(prices.map((price) => [price.id, price]))
  const priceListEntryByPriceId = new Map(
    priceList?.entries.map((entry) => [entry.priceId, entry]) ?? []
  )
  const lines: PreparedDocumentLine[] = []
  const lineAmounts: DocumentLineAmounts[] = []

  for (const line of params) {
    const selectedItem = line.itemId
      ? (itemById.get(line.itemId) ?? null)
      : null
    const selectedVariant = line.variantId
      ? (variantById.get(line.variantId) ?? null)
      : null
    const selectedPrice = line.priceId
      ? (priceById.get(line.priceId) ?? null)
      : null
    const selectedEntry = selectedPrice
      ? (priceListEntryByPriceId.get(selectedPrice.id) ?? null)
      : null

    const resolvedItem =
      selectedItem ?? selectedPrice?.item ?? selectedVariant?.item ?? null
    if (
      selectedVariant &&
      (selectedItem?.id ?? selectedPrice?.item?.id ?? selectedVariant.itemId) !==
        selectedVariant.itemId
    )
      return {
        data: null,
        error: 'The selected item variant does not belong to this line item.',
      }
    if (resolvedItem?.variantMode === 'variant' && !selectedVariant)
      return {
        data: null,
        error: 'Choose a variant for each variant-based item.',
      }
    if (selectedVariant && resolvedItem?.variantMode !== 'variant')
      return {
        data: null,
        error: 'The selected item does not use variants.',
      }

    const resolvedCurrency =
      priceList?.mode === 'CUSTOM' && selectedEntry
        ? (priceList.currency ?? selectedPrice?.currency)
        : selectedPrice?.currency
    if (selectedPrice && resolvedCurrency !== currency) {
      return {
        data: null,
        error: 'Every selected price must use the document currency.',
      }
    }

    const variantDefaultAmount =
      selectedVariant?.defaultSellingCurrency === currency
        ? selectedVariant.defaultSellingAmount
        : null
    const defaultItemAmount =
      resolvedItem?.defaultSellingCurrency === currency
        ? resolvedItem.defaultSellingAmount
        : null
    const unitAmount = selectedPrice
      ? (selectedEntry?.unitAmount ??
        selectedPrice.unitAmount ??
        selectedPrice.tiers[0]?.unitAmount ??
        0n)
      : (line.unitAmount ?? variantDefaultAmount ?? defaultItemAmount)
    if (unitAmount === null || unitAmount === undefined) {
      return {
        data: null,
        error:
          'Each line needs a unit amount or a matching item/variant/price default.',
      }
    }

    const description =
      line.description ??
      (resolvedItem && selectedVariant
        ? `${resolvedItem.name} — ${selectedVariant.name}`
        : resolvedItem?.name) ??
      selectedPrice?.plan?.name ??
      selectedPrice?.addon?.name ??
      selectedPrice?.plan?.product.name ??
      selectedPrice?.addon?.product.name ??
      null
    if (!description)
      return { data: null, error: 'Each line needs a description.' }

    const lineTaxAmount = line.taxAmount ?? 0n
    const discountAmount = line.discountAmount ?? 0n
    let lineSubtotal: bigint
    try {
      lineSubtotal = selectedPrice?.pricingModel
        ? resolveCatalogLineAmount(
            selectedPrice,
            selectedEntry,
            priceList,
            line.quantity
          )
        : unitAmount * BigInt(line.quantity)
    } catch {
      return {
        data: null,
        error: 'The selected catalog price does not cover this quantity.',
      }
    }
    lineAmounts.push({
      subtotalAmount: lineSubtotal,
      taxAmount: lineTaxAmount,
      discountAmount,
    })
    lines.push({
      itemId: resolvedItem?.id ?? null,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variantSku: selectedVariant?.sku ?? null,
      priceId: selectedPrice?.id ?? null,
      description,
      unit: resolvedItem?.unit ?? selectedPrice?.unitName ?? null,
      quantity: line.quantity,
      unitAmount,
      taxAmount: lineTaxAmount,
      discountAmount,
      totalAmount: 0n,
    })
  }

  // One implementation of the arithmetic, shared with the document line-item
  // editor via `@876/core/money`. It also owns the line-discount invariant.
  const totals = calculateDocumentTotals({ lines: lineAmounts })
  if (totals.error !== null) return { data: null, error: totals.error.message }

  for (const [index, entry] of totals.data.lines.entries()) {
    const line = lines[index]
    if (line) line.totalAmount = entry.totalAmount
  }

  return {
    data: {
      lines,
      lineAmounts,
      subtotalAmount: totals.data.subtotalAmount,
      taxAmount: totals.data.taxAmount,
      totalAmount: totals.data.linesTotalAmount,
      priceList: priceList ? { id: priceList.id, name: priceList.name } : null,
    },
    error: null,
  }
}

function resolveCatalogLineAmount(
  price: Parameters<typeof calculateCatalogAmount>[0],
  entry: {
    unitAmount: bigint | null
    tiers: { fromUnit: number; toUnit: number | null; unitAmount: bigint }[]
  } | null,
  priceList: {
    mode: 'PERCENTAGE' | 'CUSTOM'
    direction: 'MARKUP' | 'MARKDOWN' | null
    percentage: { toString(): string } | null
    rounding: 'NONE' | 'NEAREST' | 'UP' | 'DOWN'
    roundingPrecision: number
  } | null,
  quantity: number
) {
  const baseAmount = calculateCatalogAmount(price, quantity)
  if (!priceList) return baseAmount
  if (priceList.mode === 'PERCENTAGE') {
    if (!priceList.direction || priceList.percentage === null)
      throw new Error('Percentage price list is incomplete.')
    return applyPercentageAdjustment(
      baseAmount,
      priceList.direction,
      Number(priceList.percentage),
      priceList.rounding,
      priceList.roundingPrecision
    )
  }
  if (!entry) return baseAmount
  const volumeTier = entry.tiers.find(
    (tier) =>
      quantity >= tier.fromUnit &&
      (tier.toUnit === null || quantity <= tier.toUnit)
  )
  if (volumeTier) return volumeTier.unitAmount * BigInt(quantity)
  return calculateCatalogAmount(
    { ...price, unitAmount: entry.unitAmount ?? price.unitAmount },
    quantity
  )
}
