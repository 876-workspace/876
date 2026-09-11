import {
  calculateLineSubtotal,
  MAX_PERCENT_BASIS_POINTS,
  resolvePercentageDiscount,
} from '@876/core/money'

import type { DocumentLineDraft } from './document-line-items-editor'
import { parseMinorAmountInput } from '../money-input'

/** Converts an editable document row into the exact create payload the API accepts. */
export function prepareDocumentLine(
  line: DocumentLineDraft,
  decimalPlaces: number,
  usePriceList = false
) {
  const quantity = Number(line.quantity)
  const unitAmount = parseMinorAmountInput(line.unitAmount, decimalPlaces, true)
  const discountInput = parseMinorAmountInput(
    line.discountAmount || '0',
    line.discountType === 'PERCENTAGE' ? 2 : decimalPlaces,
    true
  )
  const taxAmount = parseMinorAmountInput(
    line.taxAmount || '0',
    decimalPlaces,
    true
  )
  if (
    !line.description.trim() ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    (unitAmount === null && !(usePriceList && line.priceId)) ||
    discountInput === null ||
    taxAmount === null ||
    (line.discountType === 'PERCENTAGE' &&
      BigInt(discountInput) > MAX_PERCENT_BASIS_POINTS)
  )
    return null

  const lineSubtotal =
    usePriceList && line.priceId && line.resolvedSubtotal != null
      ? BigInt(
          parseMinorAmountInput(line.resolvedSubtotal, decimalPlaces, true) ??
            '0'
        )
      : (calculateLineSubtotal(BigInt(unitAmount ?? '0'), quantity) ?? 0n)
  const discountAmount =
    line.discountType === 'PERCENTAGE'
      ? (
          resolvePercentageDiscount(lineSubtotal, BigInt(discountInput)) ?? 0n
        ).toString()
      : discountInput
  if (BigInt(discountAmount) > lineSubtotal) return null

  return {
    ...(line.itemId ? { itemId: line.itemId } : {}),
    ...(line.variantId ? { variantId: line.variantId } : {}),
    ...(line.priceId ? { priceId: line.priceId } : {}),
    description: line.description.trim(),
    quantity,
    ...(usePriceList && line.priceId ? {} : { unitAmount }),
    discountAmount,
    taxAmount,
  }
}
