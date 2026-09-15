'use client'

import type {
  DeletedDocumentTemplate,
  DocumentTemplate,
  DocumentTemplateCreateParams,
  DocumentTemplateList,
  DocumentTemplateListParams,
  DocumentTemplateUpdateParams,
  ResolvedDocumentTemplate,
} from '@876/billing'

import { request } from './request'

const resourcePath = (templateId: string) =>
  `/api/v1/document-templates/${encodeURIComponent(templateId)}`

const deleteTemplate = (templateId: string) =>
  request<DeletedDocumentTemplate>(resourcePath(templateId), {
    method: 'DELETE',
  })

export const documentTemplates = {
  list(params: DocumentTemplateListParams = {}) {
    const query = new URLSearchParams()
    if (params.documentType) query.set('documentType', params.documentType)
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return request<DocumentTemplateList>(`/api/v1/document-templates${suffix}`)
  },
  create(params: DocumentTemplateCreateParams) {
    return request<DocumentTemplate>('/api/v1/document-templates', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  retrieve(templateId: string) {
    return request<DocumentTemplate>(resourcePath(templateId), {
      method: 'GET',
    })
  },
  update(templateId: string, params: DocumentTemplateUpdateParams) {
    return request<DocumentTemplate>(resourcePath(templateId), {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },
  delete: deleteTemplate,
  setDefault(templateId: string) {
    return request<DocumentTemplate>(
      `${resourcePath(templateId)}/set-default`,
      { method: 'POST', body: JSON.stringify({}) }
    )
  },
  resolve(documentType: DocumentTemplate['documentType'], templateId?: string) {
    const query = new URLSearchParams({ documentType })
    if (templateId) query.set('templateId', templateId)
    return request<ResolvedDocumentTemplate>(
      `/api/v1/document-templates/resolved?${query.toString()}`
    )
  },
}
