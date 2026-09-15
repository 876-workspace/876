import type { ReactNode } from 'react'
import type { Branding } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
  DocumentTemplateType,
} from '@876/core/document-templates'
import {
  findDocumentTemplateLayout,
  layoutDefaults,
} from '@876/core/document-templates'

import { sampleDocumentFor } from './sample-document'
import { TemplatedDocument } from './templated-document'

export interface DocumentTemplateGalleryTemplate {
  id: string
  name: string
  layout: DocumentTemplateLayoutKey
  isDefault: boolean
  settings: DocumentTemplateSettings
}

export interface DocumentTemplateGalleryProps {
  documentType: DocumentTemplateType
  templates: DocumentTemplateGalleryTemplate[]
  branding: Branding
  /** `null` for a viewer who may not create templates: the create links are omitted. */
  newHref: string | null
  /** `null` for a viewer who may not edit templates: the edit links are omitted. */
  editHrefBase: string | null
  /** Already-rendered host actions per template id (set-default/delete). */
  cardActions?: Record<string, ReactNode>
}

function layoutLabel(layout: DocumentTemplateLayoutKey): string {
  return findDocumentTemplateLayout(layout)?.label ?? layout
}

export function DocumentTemplateGallery({
  documentType,
  templates,
  branding,
  newHref,
  editHrefBase,
  cardActions,
}: DocumentTemplateGalleryProps) {
  if (templates.length === 0) {
    return (
      <div>
        <TemplateCard
          documentType={documentType}
          name="Standard"
          layout="standard"
          isDefault
          settings={layoutDefaults('standard', documentType)}
          branding={branding}
          editHref={newHref}
          editLabel="Customize"
        />
        {newHref ? (
          <p className="mt-4">
            <a
              href={newHref}
              className="text-sm font-medium underline underline-offset-4"
            >
              Create a template
            </a>
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <div>
      {newHref ? (
        <p className="mb-4">
          <a
            href={newHref}
            className="text-sm font-medium underline underline-offset-4"
          >
            New template
          </a>
        </p>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <li key={template.id}>
            <TemplateCard
              documentType={documentType}
              name={template.name}
              layout={template.layout}
              isDefault={template.isDefault}
              settings={template.settings}
              branding={branding}
              editHref={editHrefBase ? `${editHrefBase}/${template.id}` : null}
              editLabel="Edit"
              actions={cardActions?.[template.id]}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TemplateCard({
  documentType,
  name,
  layout,
  isDefault,
  settings,
  branding,
  editHref,
  editLabel,
  actions,
}: {
  documentType: DocumentTemplateType
  name: string
  layout: DocumentTemplateLayoutKey
  isDefault: boolean
  settings: DocumentTemplateSettings
  branding: Branding
  editHref: string | null
  editLabel: string
  actions?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div aria-hidden className="pointer-events-none max-h-64 overflow-hidden">
        <div className="origin-top scale-[0.55]">
          <TemplatedDocument
            documentType={documentType}
            layout={layout}
            settings={settings}
            branding={branding}
            document={sampleDocumentFor(documentType)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-muted-foreground text-xs">{layoutLabel(layout)}</p>
        </div>
        {isDefault ? (
          <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
            Default
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 border-t p-3">
        {editHref ? (
          <a
            href={editHref}
            className="text-sm font-medium underline underline-offset-4"
          >
            {editLabel}
          </a>
        ) : null}
        {actions}
      </div>
    </div>
  )
}
