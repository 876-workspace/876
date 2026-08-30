'use client'

import type { CrmRequest, CrmRequestCreateInput, CrmRequestNote, CrmRequestNoteCreateInput, CrmRequestNoteList, CrmRequestUpdateInput } from '@876/crm'
import { request } from './request'

export type RequestCreateInput = Omit<CrmRequestCreateInput, 'createdBy'>
export type RequestUpdateInput = CrmRequestUpdateInput
export type RequestNoteCreateInput = Pick<CrmRequestNoteCreateInput, 'body' | 'visibility'>

export const requests = {
  create(params: RequestCreateInput) { return request<CrmRequest>('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) }) },
  update(id: string, params: RequestUpdateInput) { return request<CrmRequest>(`/api/requests/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) }) },
  delete(id: string, reason?: string) { return request<{ object: 'request'; id: string; deleted: true }>(`/api/requests/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: reason ?? null }) }) },
}

export const requestNotes = {
  list(requestId: string) { return request<CrmRequestNoteList>(`/api/requests/${encodeURIComponent(requestId)}/notes`) },
  create(requestId: string, params: RequestNoteCreateInput) { return request<CrmRequestNote>(`/api/requests/${encodeURIComponent(requestId)}/notes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) }) },
  update(requestId: string, noteId: string, params: { body: string }) { return request<CrmRequestNote>(`/api/requests/${encodeURIComponent(requestId)}/notes/${encodeURIComponent(noteId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) }) },
  delete(requestId: string, noteId: string) { return request<{ object: 'request_note'; id: string; deleted: true }>(`/api/requests/${encodeURIComponent(requestId)}/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' }) },
}
