import { prisma } from '@/lib/db'
import type { DocumentLineCreateParams } from '@/types/document-line'

import { applyPercentageAdjustment, calculateCatalogAmount } from '../pricing'

type PreparedDocumentLine = {
  itemId: string | null
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
  const priceIds = [
    ...new Set(params.flatMap((line) => (line.priceId ? [line.priceId] : []))),
  ]

  const [items, prices, priceList] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: itemIds }, tenantId, isActive: true },
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
  if (prices.length !== priceIds.length)
    return { data: null, error: 'One or more selected prices were not found.' }
  if (priceListId && !priceList)
    return { data: null, error: 'The selected price list was not found.' }

  const itemById = new Map(items.map((item) => [item.id, item]))
  const priceById = new Map(prices.map((price) => [price.id, price]))
  const priceListEntryByPriceId = new Map(
    priceList?.entries.map((entry) => [entry.priceId, entry]) ?? []
  )
  const lines: PreparedDocumentLine[] = []
  let subtotalAmount = 0n
  let taxAmount = 0n
  let totalAmount = 0n

  for (const line of params) {
    const selectedItem = line.itemId
      ? (itemById.get(line.itemId) ?? null)
      : null
    const selectedPrice = line.priceId
      ? (priceById.get(line.priceId) ?? null)
      : null
    const selectedEntry = selectedPrice
      ? (priceListEntryByPriceId.get(selectedPrice.id) ?? null)
      : null
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

    const resolvedItem = selectedItem ?? selectedPrice?.item ?? null
    const defaultItemAmount =
      resolvedItem?.defaultSellingCurrency === currency
        ? resolvedItem.defaultSellingAmount
        : null
    const unitAmount = selectedPrice
      ? (selectedEntry?.unitAmount ??
        selectedPrice.unitAmount ??
        selectedPrice.tiers[0]?.unitAmount ??
        0n)
      : (line.unitAmount ?? defaultItemAmount)
    if (unitAmount === null || unitAmount === undefined) {
      return {
        data: null,
        error:
          'Each line needs a unit amount or a matching item/price default.',
      }
    }

    const description =
      line.description ??
      resolvedItem?.name ??
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
    if (discountAmount > lineSubtotal) {
      return {
        data: null,
        error: 'A line discount cannot exceed the line subtotal.',
      }
    }

    const lineTotalAmount = lineSubtotal - discountAmount + lineTaxAmount
    lines.push({
      itemId: resolvedItem?.id ?? null,
      priceId: selectedPrice?.id ?? null,
      description,
      unit: resolvedItem?.unit ?? selectedPrice?.unitName ?? null,
      quantity: line.quantity,
      unitAmount,
      taxAmount: lineTaxAmount,
      discountAmount,
      totalAmount: lineTotalAmount,
    })
    subtotalAmount += lineSubtotal
    taxAmount += lineTaxAmount
    totalAmount += lineTotalAmount
  }

  return {
    data: {
      lines,
      subtotalAmount,
      taxAmount,
      totalAmount,
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
