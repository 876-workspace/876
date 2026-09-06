import { parseDecimalToMinorUnits } from '@876/core/money'
import type { DocumentLineDraft } from '@876/billing-ui/document/document-line-items-editor'

import type { DocumentLineCreateParams } from '@/lib/client/documents'

export function initialDocumentLine(): DocumentLineDraft {
  return {
    id: 'line-1',
    description: '',
    quantity: '1',
    unitAmount: '',
    discountAmount: '',
    taxAmount: '',
  }
}

export function toInvoiceLine(
  line: DocumentLineDraft
): DocumentLineCreateParams | null {
  const quantity = Number(line.quantity)
  const unitAmount = parseDecimalToMinorUnits(line.unitAmount)
  const discountAmount = parseDecimalToMinorUnits(line.discountAmount || '0')
  const taxAmount = parseDecimalToMinorUnits(line.taxAmount || '0')

  if (
    !line.description.trim() ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1_000_000 ||
    unitAmount === null ||
    unitAmount < 0n ||
    discountAmount === null ||
    discountAmount < 0n ||
    taxAmount === null ||
    taxAmount < 0n
  )
    return null

  return {
    description: line.description.trim(),
    quantity,
    unitAmount: unitAmount.toString(),
    discountAmount: discountAmount.toString(),
    taxAmount: taxAmount.toString(),
  }
}
