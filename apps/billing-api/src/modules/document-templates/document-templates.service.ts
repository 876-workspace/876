import {
  DOCUMENT_TEMPLATE_SCHEMA_VERSION,
  layoutSupportsDocumentType,
  type DocumentTemplateType,
} from '@876/core/document-templates'
import {
  DEFAULT_BRANDING,
  resolveBranding,
  type BrandingUpdate,
} from '@876/core/branding'
import { nowUnixSeconds } from '@876/core/timestamps'
import { appError } from '@/http/errors'
import { getSettings } from '@/config'
import { generateId } from '@/platform/ids'
import { listObject } from '@/http/envelope'
import type {
  DocumentTemplateCreateBody,
  DocumentTemplateUpdateBody,
} from './document-templates.schemas'
import { documentTemplatesRepository as repository } from './document-templates.repository'
import {
  serializeBranding,
  serializeDocumentTemplate,
  serializeResolvedDocumentTemplate,
} from './document-templates.serializers'

function assertSupported(
  layout: Parameters<typeof layoutSupportsDocumentType>[0],
  documentType: DocumentTemplateType
) {
  if (!layoutSupportsDocumentType(layout, documentType))
    throw appError('billing/document-template-layout-unsupported')
}

async function templateOrThrow(tenantId: string, templateId: string) {
  const template = await repository.retrieve(tenantId, templateId)
  if (!template) throw appError('billing/document-template-not-found')
  return template
}

function sameBranding(
  a: ReturnType<typeof resolveBranding>,
  b: typeof DEFAULT_BRANDING
) {
  return (
    a.accentColor === b.accentColor &&
    a.appearance === b.appearance &&
    a.sidebarTone === b.sidebarTone
  )
}

export const documentTemplatesService = {
  async list(tenantId: string, documentType?: DocumentTemplateType) {
    const rows = await repository.list(tenantId, documentType)
    return listObject({
      data: rows.map(serializeDocumentTemplate),
      hasMore: false,
      totalCount: rows.length,
      url: '/api/v1/document-templates',
    })
  },
  async retrieve(tenantId: string, templateId: string) {
    return serializeDocumentTemplate(
      await templateOrThrow(tenantId, templateId)
    )
  },
  async create(
    tenantId: string,
    body: DocumentTemplateCreateBody,
    actorId: string | null
  ) {
    assertSupported(body.layout, body.documentType)
    const now = nowUnixSeconds()
    const row = await repository.create({
      id: generateId('DocumentTemplate'),
      tenantId,
      documentType: body.documentType,
      name: body.name,
      layout: body.layout,
      settings: body.settings,
      isDefault: body.isDefault,
      schemaVersion: DOCUMENT_TEMPLATE_SCHEMA_VERSION,
      actorId,
      now,
    })
    if (!row) throw appError('billing/document-template-limit-reached')

    return serializeDocumentTemplate(row)
  },
  async update(
    tenantId: string,
    templateId: string,
    body: DocumentTemplateUpdateBody,
    actorId: string | null
  ) {
    const current = await templateOrThrow(tenantId, templateId)
    if (body.layout)
      assertSupported(body.layout, current.documentType as DocumentTemplateType)
    const row = await repository.update({
      tenantId,
      id: templateId,
      data: body,
      actorId,
      now: nowUnixSeconds(),
    })
    if (!row) throw appError('billing/document-template-not-found')
    return serializeDocumentTemplate(row)
  },
  async setDefault(
    tenantId: string,
    templateId: string,
    actorId: string | null
  ) {
    const row = await repository.setDefault(
      tenantId,
      templateId,
      actorId,
      nowUnixSeconds()
    )
    if (!row) throw appError('billing/document-template-not-found')
    return serializeDocumentTemplate(row)
  },
  async delete(tenantId: string, templateId: string, actorId: string | null) {
    const hard = getSettings().deletionMode === 'hard'
    const row = await repository.delete(
      tenantId,
      templateId,
      actorId,
      nowUnixSeconds(),
      hard
    )
    if (!row) throw appError('billing/document-template-not-found')
    return {
      object: 'document-template' as const,
      id: row.id,
      deleted: true as const,
    }
  },
  async resolve(
    tenantId: string,
    documentType: DocumentTemplateType,
    templateId?: string
  ) {
    const template = templateId
      ? await templateOrThrow(tenantId, templateId)
      : await repository.retrieveDefault(tenantId, documentType)
    if (template && template.documentType !== documentType)
      throw appError('billing/document-template-not-found')
    const branding = await repository.retrieveBranding(tenantId)
    return serializeResolvedDocumentTemplate({
      documentType,
      template,
      branding,
    })
  },
  async retrieveBranding(tenantId: string) {
    const row = await repository.retrieveBranding(tenantId)
    return serializeBranding(row, row?.updatedAt ?? null)
  },
  async updateBranding(
    tenantId: string,
    body: BrandingUpdate,
    actorId: string | null
  ) {
    const existing = await repository.retrieveBranding(tenantId)
    const resolved = { ...resolveBranding(existing), ...body }
    const row = await repository.updateBranding({
      tenantId,
      data: resolved,
      actorId,
      now: nowUnixSeconds(),
      useDefaults: sameBranding(resolved, DEFAULT_BRANDING),
    })
    return serializeBranding(row, row?.updatedAt ?? null)
  },
}
