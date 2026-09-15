import Link from 'next/link'

import {
  DOCUMENT_TITLES,
  DOCUMENT_TEMPLATE_TYPES,
  documentTemplateTypeSchema,
  type DocumentTemplateType,
} from '@876/core/document-templates'
import { cn } from '@876/ui/lib/utils'

/** Resolves `?type=` against the known document types, defaulting to invoice. */
export function resolveDocumentTypeParam(value: unknown): DocumentTemplateType {
  const parsed = documentTemplateTypeSchema.safeParse(value)
  return parsed.success ? parsed.data : 'invoice'
}

function typeHref(orgSlug: string, type: DocumentTemplateType): string {
  return `/${orgSlug}/settings/templates?type=${type}`
}

/** Server-rendered tab row; the active tab is known from search params. */
export function DocumentTypeTabs({
  orgSlug,
  active,
}: {
  orgSlug: string
  active: DocumentTemplateType
}) {
  return (
    <nav
      aria-label="Document types"
      className="border-border flex gap-1 overflow-x-auto border-b"
    >
      {DOCUMENT_TEMPLATE_TYPES.map((type) => {
        const isActive = type === active
        return (
          <Link
            key={type}
            href={typeHref(orgSlug, type)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative inline-flex items-center border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-all',
              isActive
                ? 'border-876-blue text-876-blue'
                : 'text-muted-foreground hover:text-foreground hover:border-876-surface-border border-transparent'
            )}
          >
            {DOCUMENT_TITLES[type]}
          </Link>
        )
      })}
    </nav>
  )
}
