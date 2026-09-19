import type { ReactNode } from 'react'

import type { Branding } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import { DocumentTemplateGallery } from '@876/billing-ui/documents/document-template-gallery'
import { AppError } from '@876/ui/app-error'

import { getAppError } from '@/lib/errors'
import { resolveFinanceErrorCode } from '@/lib/errors/finance'
import { createBillingIntegration } from '@/lib/clients/billing'

import { TemplateCardActions } from './template-card-actions'

interface TemplatesGalleryDataProps {
  orgSlug: string
  orgId: string
  documentType: DocumentTemplateType
  canManage: boolean
}

/** Loads templates and branding for one document type, then renders the gallery. */
export async function TemplatesGalleryData({
  orgSlug,
  orgId,
  documentType,
  canManage,
}: TemplatesGalleryDataProps) {
  const billing = createBillingIntegration()
  const [listed, retrieved] = await Promise.all([
    billing.documentTemplates.list(orgId, { documentType }),
    billing.branding.retrieve(orgId),
  ])
  const failure = listed.error ?? retrieved.error

  const templates = (listed.data?.data ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    layout: item.layout as DocumentTemplateLayoutKey,
    isDefault: Boolean(item.isDefault),
    resolvedSettings: item.resolvedSettings as DocumentTemplateSettings,
  }))
  const branding: Branding | null = retrieved.data
    ? {
        accentColor: retrieved.data.accentColor,
        appearance: retrieved.data.appearance,
        sidebarTone: retrieved.data.sidebarTone,
      }
    : null

  // Branding tints every preview, so without it there is nothing truthful to
  // render. The page chrome above this boundary stays mounted.
  if (!branding) {
    return (
      <div>
        {failure ? (
          <AppError
            title="Templates could not be loaded"
            error={getAppError(
              resolveFinanceErrorCode('document-template', failure.code)
            )}
            variant="banner"
          />
        ) : null}
        <p className="text-muted-foreground py-10 text-center text-sm">
          Template previews are unavailable right now.
        </p>
      </div>
    )
  }

  const cardActions: Record<string, ReactNode> = canManage
    ? Object.fromEntries(
        templates.map((template) => [
          template.id,
          <TemplateCardActions
            key={template.id}
            orgSlug={orgSlug}
            templateId={template.id}
            isDefault={template.isDefault}
            canManage={canManage}
          />,
        ])
      )
    : {}

  return (
    <div>
      {failure ? (
        <div className="mb-4">
          <AppError
            title="Templates could not be loaded"
            error={getAppError(
              resolveFinanceErrorCode('document-template', failure.code)
            )}
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
          canManage
            ? `/${orgSlug}/settings/templates/new?type=${documentType}`
            : null
        }
        editHrefBase={canManage ? `/${orgSlug}/settings/templates` : null}
        cardActions={cardActions}
      />
    </div>
  )
}
