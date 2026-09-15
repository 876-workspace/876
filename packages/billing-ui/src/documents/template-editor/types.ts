import type { DocumentTemplateSettings } from '@876/core/document-templates'

export type Patch = (mutator: (draft: DocumentTemplateSettings) => void) => void

export type ReportInvalid = (fieldId: string, message: string | null) => void

export interface TemplateTabProps {
  settings: DocumentTemplateSettings
  patch: Patch
  onInvalid: ReportInvalid
}
