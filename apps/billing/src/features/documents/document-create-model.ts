import type { DocumentLineDraft } from '@876/billing-ui/document/document-line-items-editor'

export function emptyDocumentLine(id: string): DocumentLineDraft {
  return {
    id,
    selectionId: '',
    itemId: null,
    priceId: null,
    description: '',
    quantity: '1',
    unitAmount: '',
    resolvedSubtotal: null,
    discountType: 'AMOUNT',
    discountAmount: '0',
    taxAmount: '0',
  }
}
