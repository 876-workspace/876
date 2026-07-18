import type {
  InvoicePreferenceResource,
  InvoicePreferenceUpdated,
  InvoicePreferenceUpdateInput,
  LateFeeRun,
} from '@/types/invoice-preference'

import { request } from './request'

export const retrieve = () =>
  request<InvoicePreferenceResource>('/api/v1/invoice-preferences', {
    method: 'GET',
  })

export const update = (params: InvoicePreferenceUpdateInput) =>
  request<InvoicePreferenceUpdated>('/api/v1/invoice-preferences', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const assessLateFees = () =>
  request<LateFeeRun>('/api/v1/invoice-preferences/assess-late-fees', {
    method: 'POST',
  })

export const invoicePreferences = { retrieve, update, assessLateFees }
