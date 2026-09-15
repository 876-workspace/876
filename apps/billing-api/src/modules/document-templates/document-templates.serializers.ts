import {
  DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
  resolveDocumentTemplate,
  type DocumentTemplateType,
} from '@876/core/document-templates'
import { resolveBranding } from '@876/core/branding'

type TemplateRow = {
  id: string
  documentType: string
  name: string
  layout: string
  isDefault: boolean
  settings: unknown
  createdAt: number
  updatedAt: number
}

export function serializeDocumentTemplate(row: TemplateRow) {
  const documentType = row.documentType as DocumentTemplateType
  const layout = row.layout as typeof DEFAULT_DOCUMENT_TEMPLATE_LAYOUT
  return {
    object: 'document-template' as const,
    id: row.id,
    documentType,
    name: row.name,
    layout,
    isDefault: row.isDefault,
    settings: row.settings,
    resolvedSettings: resolveDocumentTemplate(
      layout,
      documentType,
      row.settings
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeResolvedDocumentTemplate(input: {
  documentType: DocumentTemplateType
  template: TemplateRow | null
  branding: unknown
}) {
  const layout = input.template
    ? (input.template.layout as typeof DEFAULT_DOCUMENT_TEMPLATE_LAYOUT)
    : DEFAULT_DOCUMENT_TEMPLATE_LAYOUT
  return {
    object: 'resolved-document-template' as const,
    documentType: input.documentType,
    templateId: input.template?.id ?? null,
    name: input.template?.name ?? null,
    layout,
    settings: resolveDocumentTemplate(
      layout,
      input.documentType,
      input.template?.settings ?? {}
    ),
    branding: resolveBranding(input.branding),
  }
}

export function serializeBranding(row: unknown, updatedAt: number | null) {
  return { object: 'branding' as const, ...resolveBranding(row), updatedAt }
}
