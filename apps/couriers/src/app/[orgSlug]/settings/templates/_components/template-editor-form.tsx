'use client'

import { useRouter } from 'next/navigation'

import type { Branding } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateType,
} from '@876/core/document-templates'
import {
  DocumentTemplateEditor,
  type DocumentTemplateEditorSubmit,
} from '@876/billing-ui/documents/document-template-editor'

import { financeDocumentTemplates } from '@/lib/client/finance'

interface TemplateEditorInitial {
  name: string
  layout: DocumentTemplateLayoutKey
  settings: DocumentTemplateOverrides
}

type TemplateEditorFormProps = {
  orgSlug: string
  documentType: DocumentTemplateType
  branding: Branding
  initial: TemplateEditorInitial
  cancelHref: string
} & (
  | { mode: 'create'; templateId?: undefined }
  | { mode: 'update'; templateId: string }
)

/** Client boundary for the shared template editor; callbacks stay in here. */
export function TemplateEditorForm({
  orgSlug,
  mode,
  templateId,
  documentType,
  branding,
  initial,
  cancelHref,
}: TemplateEditorFormProps) {
  const router = useRouter()

  async function handleSubmit(value: DocumentTemplateEditorSubmit) {
    const result =
      mode === 'create'
        ? await financeDocumentTemplates.create(orgSlug, {
            documentType,
            name: value.name,
            layout: value.layout,
            settings: value.settings,
          })
        : await financeDocumentTemplates.update(orgSlug, templateId, {
            name: value.name,
            layout: value.layout,
            settings: value.settings,
          })
    if (result.error) return { error: { message: result.error.message } }
    router.push(`/${orgSlug}/settings/templates?type=${documentType}`)
    return { error: null }
  }

  return (
    <DocumentTemplateEditor
      documentType={documentType}
      branding={branding}
      initial={initial}
      submitLabel="Save"
      cancelHref={cancelHref}
      onSubmit={handleSubmit}
    />
  )
}
