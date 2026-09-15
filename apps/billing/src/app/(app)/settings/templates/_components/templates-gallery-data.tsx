import type { ReactNode } from 'react'

import type { Branding } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import { DocumentTemplateGallery } from '@876/billing-ui/documents/document-template-gallery'
import { AppError } from '@876/ui/app-error'

import { service } from '@/lib/service'
import { BillingApiError } from '@/lib/service/api'

import { TemplateCardActions } from './template-card-actions'

interface GalleryTemplate {
  id: string
  name: string
  layout: DocumentTemplateLayoutKey
  isDefault: boolean
  resolvedSettings: DocumentTemplateSettings
}

interface TemplatesGalleryDataProps {
  tenantId: string
  documentType: DocumentTemplateType
  canManage: boolean
}

function loadErrorOf(error: unknown): { code: string; message: string } {
  if (error instanceof BillingApiError)
    return { code: error.code, message: error.message }
  return {
    code: 'templates/load-failed',
    message: 'Templates could not be loaded. Try again.',
  }
}

export async function TemplatesGalleryData({
  tenantId,
  documentType,
  canManage,
}: TemplatesGalleryDataProps) {
  let templates: GalleryTemplate[] = []
  let branding: Branding | null = null
  let loadError: { code: string; message: string } | null = null

  try {
    const [listed, retrieved] = await Promise.all([
      service.documentTemplates.list(tenantId, documentType),
      service.branding.retrieve(tenantId),
    ])
    templates = listed.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      layout: item.layout as DocumentTemplateLayoutKey,
      isDefault: Boolean(item.isDefault),
      resolvedSettings: item.resolvedSettings as DocumentTemplateSettings,
    }))
    branding = {
      accentColor: retrieved.accentColor,
      appearance: retrieved.appearance,
      sidebarTone: retrieved.sidebarTone,
    }
  } catch (error) {
    loadError = loadErrorOf(error)
  }

  // Branding tints every preview, so without it there is nothing truthful to
  // render. The page chrome above this boundary stays mounted.
  if (!branding) {
    return (
      <div>
        {loadError ? (
          <AppError
            title="Templates could not be loaded"
            error={loadError}
            variant="banner"
          />
        ) : null}
        <p className="text-muted-foreground py-10 text-center text-sm">
          Template previews are unavailable right now.
        </p>
      </div>
    )
  }

  const cardActions: Record<string, ReactNode> = Object.fromEntries(
    templates.map((template) => [
      template.id,
      <TemplateCardActions
        key={template.id}
        templateId={template.id}
        isDefault={template.isDefault}
        canManage={canManage}
      />,
    ])
  )

  return (
    <div>
      {loadError ? (
        <div className="mb-4">
          <AppError
            title="Templates could not be loaded"
            error={loadError}
            variant="banner"
          />
        </div>
      ) : null}
      <DocumentTemplateGallery
        documentType={documentType}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          layout: template.layout,
          isDefault: template.isDefault,
          settings: template.resolvedSettings,
        }))}
        branding={branding}
        newHref={
          canManage ? `/settings/templates/new?type=${documentType}` : null
        }
        editHrefBase={canManage ? '/settings/templates' : null}
        cardActions={cardActions}
      />
    </div>
  )
}
