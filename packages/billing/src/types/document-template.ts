import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import type { Branding as CoreBranding } from '@876/core/branding'
import type { List } from './common'

export type DocumentTemplate = {
  object: 'document-template'
  id: string
  documentType: DocumentTemplateType
  name: string
  layout: DocumentTemplateLayoutKey
  isDefault: boolean
  settings: DocumentTemplateOverrides
  resolvedSettings: DocumentTemplateSettings
  createdAt: number
  updatedAt: number
}

export type ResolvedDocumentTemplate = {
  object: 'resolved-document-template'
  documentType: DocumentTemplateType
  templateId: string | null
  name: string | null
  layout: DocumentTemplateLayoutKey
  settings: DocumentTemplateSettings
  branding: CoreBranding
}

export type DocumentTemplateCreateParams = {
  documentType: DocumentTemplateType
  name: string
  layout: DocumentTemplateLayoutKey
  settings?: DocumentTemplateOverrides
  isDefault?: boolean
}

export type DocumentTemplateUpdateParams = {
  name?: string
  layout?: DocumentTemplateLayoutKey
  settings?: DocumentTemplateOverrides
}
export type DocumentTemplateListParams = {
  documentType?: DocumentTemplate['documentType']
}
export type DocumentTemplateList = List<DocumentTemplate>
export type DeletedDocumentTemplate = {
  object: 'document-template'
  id: string
  deleted: true
}
