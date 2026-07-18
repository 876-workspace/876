import { parseMinorAmountInput } from '@/lib/format'

export interface DocumentItemOption {
  value: string
  label: string
  itemId: string | null
  priceId: string | null
  defaultAmount: string | null
  currency: string | null
}

export interface EditableDocumentLine {
  key: string
  selectionId: string
  itemId: string
  priceId: string
  description: string
  quantity: string
  unitAmount: string
  /** Price-list-resolved line subtotal in major units for the live preview. */
  resolvedSubtotal: string | null
  discountType: 'AMOUNT' | 'PERCENTAGE'
  discountValue: string
  taxAmount: string
}

export function emptyDocumentLine(key: string): EditableDocumentLine {
  return {
    key,
    selectionId: '',
    itemId: '',
    priceId: '',
    description: '',
    quantity: '1',
    unitAmount: '',
    resolvedSubtotal: null,
    discountType: 'AMOUNT',
    discountValue: '0',
    taxAmount: '0',
  }
}

export function prepareDocumentLine(
  line: EditableDocumentLine,
  decimalPlaces: number,
  usePriceList = false
) {
  const quantity = Number(line.quantity)
  const unitAmount = parseMinorAmountInput(line.unitAmount, decimalPlaces, true)
  const discountInput = parseMinorAmountInput(
    line.discountValue || '0',
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
    (line.discountType === 'PERCENTAGE' && BigInt(discountInput) > 10_000n)
  )
    return null

  const lineSubtotal =
    usePriceList && line.priceId && line.resolvedSubtotal !== null
      ? BigInt(
          parseMinorAmountInput(line.resolvedSubtotal, decimalPlaces, true) ?? 0
        )
      : BigInt(unitAmount ?? 0) * BigInt(quantity)
  const discountAmount =
    line.discountType === 'PERCENTAGE'
      ? ((lineSubtotal * BigInt(discountInput)) / 10_000n).toString()
      : discountInput
  if (BigInt(discountAmount) > lineSubtotal) return null

  return {
    ...(line.itemId ? { itemId: line.itemId } : {}),
    ...(line.priceId ? { priceId: line.priceId } : {}),
    description: line.description.trim(),
    quantity,
    ...(usePriceList && line.priceId ? {} : { unitAmount }),
    discountAmount,
    taxAmount,
  }
}

export function calculateDocumentLineTotal(line: EditableDocumentLine) {
  const quantity = Number(line.quantity)
  const rate = Number(line.unitAmount || 0)
  const subtotal =
    line.resolvedSubtotal === null
      ? quantity * rate
      : Number(line.resolvedSubtotal)
  const discount = calculateDiscount(line, subtotal)
  const tax = Number(line.taxAmount || 0)
  const value = subtotal - discount + tax
  return Number.isFinite(value) ? Math.max(value, 0) : 0
}

export function calculateDocumentTotals(lines: EditableDocumentLine[]) {
  return lines.reduce(
    (totals, line) => {
      const quantity = Number(line.quantity)
      const rate = Number(line.unitAmount || 0)
      const subtotal =
        line.resolvedSubtotal === null
          ? quantity * rate
          : Number(line.resolvedSubtotal)
      const discount = calculateDiscount(line, subtotal)
      const tax = Number(line.taxAmount || 0)
      totals.subtotal += Number.isFinite(subtotal) ? subtotal : 0
      totals.discount += Number.isFinite(discount) ? discount : 0
      totals.tax += Number.isFinite(tax) ? tax : 0
      totals.total = totals.subtotal - totals.discount + totals.tax
      return totals
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  )
}

function calculateDiscount(line: EditableDocumentLine, subtotal: number) {
  const value = Number(line.discountValue || 0)
  if (!Number.isFinite(value)) return 0
  const discount =
    line.discountType === 'PERCENTAGE' ? subtotal * (value / 100) : value
  return Math.min(Math.max(discount, 0), Math.max(subtotal, 0))
}
