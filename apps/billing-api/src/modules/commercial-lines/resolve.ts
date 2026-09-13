import {
  calculateDocumentTotals,
  type DocumentLineAmounts,
} from '@876/core/money'

import {
  resolveSellables,
  resolveVariantReferences,
  sellableKey,
} from '@/modules/catalog'
import { resolvePrices } from '@/modules/pricing'
import type {
  CommercialLineInput,
  CommercialLineSnapshot,
} from '@/types/commercial-line'
import type { ResolvedSellable, SellableReference } from '@/types/commerce'
import type { ResolvedPrice } from '@/types/pricing'

export type CommercialLineBuildResult =
  | {
      data: {
        lines: CommercialLineSnapshot[]
        lineAmounts: DocumentLineAmounts[]
        subtotalAmount: bigint
        taxAmount: bigint
        discountAmount: bigint
        totalAmount: bigint
        priceList: { id: string; name: string } | null
      }
      error: null
    }
  | { data: null; error: string }

function priceKey(priceId: string, quantity: number): string {
  return `${priceId}:${quantity}`
}

function lineSellableReference(
  line: CommercialLineInput,
  price: ResolvedPrice | null,
  variantReferences: Map<string, SellableReference>
): SellableReference | null {
  const variantReference = line.variantId
    ? (variantReferences.get(line.variantId) ?? null)
    : null
  const itemId = line.itemId ?? price?.itemId ?? variantReference?.itemId ?? null
  return itemId ? { itemId, variantId: line.variantId ?? null } : null
}

/**
 * Resolves immutable commercial-line snapshots through the canonical Catalog,
 * Pricing, and monetary calculation owners.
 */
export async function buildCommercialLines(
  tenantId: string,
  currency: string,
  params: CommercialLineInput[],
  priceListId?: string | null
): Promise<CommercialLineBuildResult> {
  const priceRequests = params.flatMap((line) =>
    line.priceId ? [{ priceId: line.priceId, quantity: line.quantity }] : []
  )
  const pricing = await resolvePrices(
    tenantId,
    currency,
    priceRequests,
    priceListId
  )
  if (pricing.error !== null) return { data: null, error: pricing.error }

  const variantIds = params.flatMap((line) =>
    line.variantId ? [line.variantId] : []
  )
  const variantReferences = await resolveVariantReferences(tenantId, variantIds)
  if (variantReferences.error !== null)
    return { data: null, error: variantReferences.error }

  const lineSelections = params.map((line) => {
    const price = line.priceId
      ? (pricing.data.prices.get(priceKey(line.priceId, line.quantity)) ?? null)
      : null
    return {
      line,
      price,
      reference: lineSellableReference(line, price, variantReferences.data),
    }
  })

  for (const selection of lineSelections) {
    if (
      selection.line.itemId &&
      selection.price?.itemId &&
      selection.line.itemId !== selection.price.itemId
    )
      return {
        data: null,
        error: 'The selected price does not belong to this line item.',
      }
  }

  const sellableReferences = lineSelections.flatMap((selection) =>
    selection.reference ? [selection.reference] : []
  )
  const sellables = await resolveSellables(tenantId, sellableReferences)
  if (sellables.error !== null) return { data: null, error: sellables.error }

  const lines: CommercialLineSnapshot[] = []
  const lineAmounts: DocumentLineAmounts[] = []
  let discountAmount = 0n

  for (const selection of lineSelections) {
    const { line, price, reference } = selection
    const sellable: ResolvedSellable | null = reference
      ? (sellables.data.get(sellableKey(reference)) ?? null)
      : null

    const sellableDefaultAmount =
      sellable?.defaultSellingCurrency === currency
        ? sellable.defaultSellingAmount
        : null
    const unitAmount = price
      ? price.unitAmount
      : (line.unitAmount ?? sellableDefaultAmount)
    if (unitAmount === null || unitAmount === undefined)
      return {
        data: null,
        error:
          'Each line needs a unit amount or a matching item/variant/price default.',
      }

    const description =
      line.description ??
      (sellable
        ? sellable.identity.variantName
          ? `${sellable.identity.name} — ${sellable.identity.variantName}`
          : sellable.identity.name
        : null) ??
      price?.description ??
      null
    if (!description)
      return { data: null, error: 'Each line needs a description.' }

    const lineTaxAmount = line.taxAmount ?? 0n
    const lineDiscountAmount = line.discountAmount ?? 0n
    const lineSubtotal = price
      ? price.lineAmount
      : unitAmount * BigInt(line.quantity)

    discountAmount += lineDiscountAmount
    lineAmounts.push({
      subtotalAmount: lineSubtotal,
      taxAmount: lineTaxAmount,
      discountAmount: lineDiscountAmount,
    })
    lines.push({
      itemId: sellable?.reference.itemId ?? price?.itemId ?? null,
      variantId: sellable?.reference.variantId ?? null,
      variantName: sellable?.identity.variantName ?? null,
      variantSku:
        sellable?.reference.variantId !== null
          ? (sellable?.identity.sku ?? null)
          : null,
      priceId: price?.priceId ?? null,
      description,
      unit: sellable?.unit ?? price?.unitName ?? null,
      quantity: line.quantity,
      unitAmount,
      taxAmount: lineTaxAmount,
      discountAmount: lineDiscountAmount,
      totalAmount: 0n,
    })
  }

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
      discountAmount,
      totalAmount: totals.data.linesTotalAmount,
      priceList: pricing.data.priceList,
    },
    error: null,
  }
}
