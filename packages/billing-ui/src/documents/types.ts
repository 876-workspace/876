import type { DocumentDetailFieldKey } from '@876/core/document-templates'

export interface TemplatedDocumentAddress {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export interface TemplatedDocumentSeller {
  name: string
  logoUrl?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  taxId?: string | null
  address?: TemplatedDocumentAddress | null
}

export interface TemplatedDocumentRecipient {
  name: string
  email?: string | null
  phone?: string | null
  billingAddress?: TemplatedDocumentAddress | null
  shippingAddress?: TemplatedDocumentAddress | null
}

export interface TemplatedDocumentLine {
  id: string
  name: string
  description?: string | null
  /** Display string, never a number. */
  quantity: string
  unit?: string | null
  /** Display strings, never numbers. */
  rate: string
  discount?: string | null
  tax?: string | null
  amount: string
}

export interface TemplatedDocumentTotals {
  subtotal?: string | null
  /** Magnitudes only: the renderer prefixes the minus sign. */
  discount?: string | null
  shipping?: string | null
  adjustment?: string | null
  tax?: string | null
  total?: string | null
  /** Magnitudes only: shown when the template enables payment details. */
  amountPaid?: string | null
  amountCredited?: string | null
  balanceDue?: string | null
  /** Rendered verbatim, never currency-stripped. */
  amountInWords?: string | null
}

export interface TemplatedDocumentTaxRow {
  label: string
  rate?: string | null
  amount: string
}

export interface TemplatedDocumentBankDetail {
  label: string
  value: string
}

export interface TemplatedDocumentData {
  seller: TemplatedDocumentSeller
  recipient: TemplatedDocumentRecipient
  details: Partial<Record<DocumentDetailFieldKey, string | null>>
  lines: TemplatedDocumentLine[]
  totals: TemplatedDocumentTotals
  taxSummary: TemplatedDocumentTaxRow[]
  notes?: string | null
  terms?: string | null
  paymentOptions: string[]
  bankDetails: TemplatedDocumentBankDetail[]
  qrCodeUrl?: string | null
}
