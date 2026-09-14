import type { DocumentLineDraft } from '@876/billing-ui/document/document-line-items-editor'

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
