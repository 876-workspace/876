import type { DocumentLineCreateParams } from './invoice'

export type RecurringInvoiceStatus = 'active' | 'paused' | 'stopped' | 'expired'
export type RecurringInvoiceGenerationMode =
  'draft' | 'finalize' | 'finalize-and-send'
export interface RecurringInvoiceFrequency {
  intervalUnit: 'day' | 'week' | 'month' | 'year'
  intervalCount: number
}
export interface RecurringInvoiceCreateParams {
  profileName: string
  customerId: string
  currency: string
  frequency: RecurringInvoiceFrequency
  startAt: number
  endAt?: number | null
  maxCycles?: number | null
  generationMode: RecurringInvoiceGenerationMode
  paymentTermId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  taxBehavior?: 'EXCLUSIVE' | 'INCLUSIVE'
  notes?: string | null
  terms?: string | null
  discountAmount?: string
  lines: DocumentLineCreateParams[]
}
export interface RecurringInvoiceFromInvoiceParams {
  profileName: string
  frequency: RecurringInvoiceFrequency
  startAt: number
  endAt?: number | null
  maxCycles?: number | null
  generationMode: RecurringInvoiceGenerationMode
}
export type RecurringInvoiceUpdateParams = Partial<RecurringInvoiceCreateParams>
export type RecurringInvoice = {
  object: 'recurring-invoice'
  id: string
} & Record<string, unknown>
export interface RecurringInvoiceList {
  object: 'list'
  data: RecurringInvoice[]
  has_more: boolean
  total_count: number | null
  url: string
}
export interface RecurringInvoiceListParams {
  status?: RecurringInvoiceStatus
  customerId?: string
}
export interface DeletedRecurringInvoice {
  object: 'recurring-invoice'
  id: string
  deleted: true
}
