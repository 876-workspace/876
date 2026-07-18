'use client'

import type {
  CreditNoteApplyInput,
  CreditNoteCreateInput,
  CreditNoteCreated,
} from '@/types/credit-note'

import { request } from './request'

const create = (params: CreditNoteCreateInput) =>
  request<CreditNoteCreated>('/api/v1/credit-notes', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const apply = (creditNoteId: string, params: CreditNoteApplyInput) =>
  request<CreditNoteCreated>(
    `/api/v1/credit-notes/${encodeURIComponent(creditNoteId)}/apply`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

const voidCreditNote = (creditNoteId: string) =>
  request<CreditNoteCreated>(
    `/api/v1/credit-notes/${encodeURIComponent(creditNoteId)}/void`,
    { method: 'POST' }
  )

export const creditNotes = { create, apply, void: voidCreditNote }
