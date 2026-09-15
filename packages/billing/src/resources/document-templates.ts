import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedDocumentTemplateSchema,
  documentTemplateListSchema,
  documentTemplateSchema,
  resolvedDocumentTemplateSchema,
} from '../schemas'
import type {
  DeletedDocumentTemplate,
  DocumentTemplate,
  DocumentTemplateCreateParams,
  DocumentTemplateList,
  DocumentTemplateListParams,
  DocumentTemplateUpdateParams,
  RequestOptions,
  ResolvedDocumentTemplate,
} from '../types'

const collectionPath = '/api/v1/document-templates'
function resourcePath(templateId: string) {
  return `${collectionPath}/${encodeURIComponent(templateId)}`
}

export function createDocumentTemplatesResource(runtime: Runtime) {
  return {
    list(params: DocumentTemplateListParams = {}, options?: RequestOptions) {
      return Request<DocumentTemplateList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath,
          query: params,
          signal: options?.signal,
        },
        documentTemplateListSchema
      )
    },
    create(params: DocumentTemplateCreateParams, options?: RequestOptions) {
      return Request<DocumentTemplate>(
        runtime,
        {
          method: 'POST',
          path: collectionPath,
          body: params,
          signal: options?.signal,
        },
        documentTemplateSchema
      )
    },
    retrieve(templateId: string, options?: RequestOptions) {
      return Request<DocumentTemplate>(
        runtime,
        {
          method: 'GET',
          path: resourcePath(templateId),
          signal: options?.signal,
        },
        documentTemplateSchema
      )
    },
    update(
      templateId: string,
      params: DocumentTemplateUpdateParams,
      options?: RequestOptions
    ) {
      return Request<DocumentTemplate>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(templateId),
          body: params,
          signal: options?.signal,
        },
        documentTemplateSchema
      )
    },
    delete(templateId: string, options?: RequestOptions) {
      return Request<DeletedDocumentTemplate>(
        runtime,
        {
          method: 'DELETE',
          path: resourcePath(templateId),
          signal: options?.signal,
        },
        deletedDocumentTemplateSchema
      )
    },
    setDefault(templateId: string, options?: RequestOptions) {
      return Request<DocumentTemplate>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(templateId)}/set-default`,
          body: {},
          signal: options?.signal,
        },
        documentTemplateSchema
      )
    },
    resolve(
      documentType: DocumentTemplate['documentType'],
      templateId?: string,
      options?: RequestOptions
    ) {
      return Request<ResolvedDocumentTemplate>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath}/resolved`,
          query: { documentType, ...(templateId ? { templateId } : {}) },
          signal: options?.signal,
        },
        resolvedDocumentTemplateSchema
      )
    },
  }
}
