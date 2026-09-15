import {
  deletedDocumentTemplateSchema,
  documentTemplateListSchema,
  documentTemplateSchema,
  resolvedDocumentTemplateSchema,
} from '../../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  DeletedDocumentTemplate,
  DocumentTemplate,
  DocumentTemplateCreateParams,
  DocumentTemplateList,
  DocumentTemplateListParams,
  DocumentTemplateUpdateParams,
  ResolvedDocumentTemplate,
} from '../../types'

function collectionPath(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/document-templates`
}
function resourcePath(organizationId: string, templateId: string) {
  return `${collectionPath(organizationId)}/${encodeURIComponent(templateId)}`
}

export function createIntegrationDocumentTemplatesResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string, params: DocumentTemplateListParams = {}) {
      return IntegrationRequest<DocumentTemplateList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId), query: params },
        documentTemplateListSchema
      )
    },
    create(organizationId: string, params: DocumentTemplateCreateParams) {
      return IntegrationRequest<DocumentTemplate>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        documentTemplateSchema
      )
    },
    retrieve(organizationId: string, templateId: string) {
      return IntegrationRequest<DocumentTemplate>(
        runtime,
        { method: 'GET', path: resourcePath(organizationId, templateId) },
        documentTemplateSchema
      )
    },
    update(
      organizationId: string,
      templateId: string,
      params: DocumentTemplateUpdateParams
    ) {
      return IntegrationRequest<DocumentTemplate>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(organizationId, templateId),
          body: params,
        },
        documentTemplateSchema
      )
    },
    delete(organizationId: string, templateId: string) {
      return IntegrationRequest<DeletedDocumentTemplate>(
        runtime,
        { method: 'DELETE', path: resourcePath(organizationId, templateId) },
        deletedDocumentTemplateSchema
      )
    },
    setDefault(organizationId: string, templateId: string) {
      return IntegrationRequest<DocumentTemplate>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, templateId)}/set-default`,
          body: {},
        },
        documentTemplateSchema
      )
    },
    resolve(
      organizationId: string,
      documentType: DocumentTemplate['documentType'],
      templateId?: string
    ) {
      return IntegrationRequest<ResolvedDocumentTemplate>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/resolved`,
          query: { documentType, ...(templateId ? { templateId } : {}) },
        },
        resolvedDocumentTemplateSchema
      )
    },
  }
}
