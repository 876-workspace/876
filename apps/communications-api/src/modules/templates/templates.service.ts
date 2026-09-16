import { err, ok, type ServiceResult } from '../../http/result.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import type {
  CreateEmailTemplateInput,
  EmailTemplateObject,
  RenderEmailTemplateInput,
  UpdateEmailTemplateInput,
} from '../../types/communications.js'
import { retrieveSender } from '../senders/senders.service.js'
import * as repository from './templates.repository.js'
import { renderEmailTemplate } from './templates.renderer.js'

type TemplateRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function toObject(row: TemplateRow): EmailTemplateObject {
  return {
    object: 'email_template',
    id: row.id,
    organizationId: row.organizationId,
    key: row.key,
    name: row.name,
    category: row.category,
    subject: row.subject,
    html: row.html,
    text: row.text,
    senderId: row.senderId,
    isDefault: row.isDefault,
    isSystem: row.isSystem,
    isActive: row.isActive,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

async function validateSender(
  organizationId: string,
  senderId: string | null | undefined
): Promise<ServiceResult<true>> {
  if (!senderId) return ok(true)

  const sender = await retrieveSender(organizationId, senderId)
  if (sender.error) return { data: null, error: sender.error }
  if (!sender.data.isActive) return err('communications/sender-not-found')
  return ok(true)
}

export async function listTemplates(
  organizationId: string
): Promise<ServiceResult<EmailTemplateObject[]>> {
  const rows = await repository.list(organizationId)
  return ok(rows.map(toObject))
}

export async function retrieveTemplate(
  organizationId: string,
  id: string
): Promise<ServiceResult<EmailTemplateObject>> {
  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/template-not-found')
  return ok(toObject(row))
}

export async function resolveTemplate(
  organizationId: string,
  category: string,
  templateId?: string
): Promise<ServiceResult<EmailTemplateObject>> {
  const row = templateId
    ? await repository.retrieve(organizationId, templateId)
    : await repository.retrieveDefault(organizationId, category)
  if (!row) return err('communications/template-not-found')
  return ok(toObject(row))
}

export async function createTemplate(
  organizationId: string,
  input: CreateEmailTemplateInput
): Promise<ServiceResult<EmailTemplateObject>> {
  const existing = await repository.retrieveByKey(organizationId, input.key)
  if (existing) return err('communications/invalid-request')

  const senderValidation = await validateSender(organizationId, input.senderId)
  if (senderValidation.error)
    return { data: null, error: senderValidation.error }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('template'),
    organizationId,
    key: input.key,
    name: input.name,
    category: input.category,
    subject: input.subject,
    html: input.html,
    text: input.text ?? null,
    senderId: input.senderId ?? null,
    isDefault: input.isDefault,
    now,
  })
  return ok(toObject(row))
}

export async function updateTemplate(
  organizationId: string,
  id: string,
  input: UpdateEmailTemplateInput
): Promise<ServiceResult<EmailTemplateObject>> {
  const current = await repository.retrieveOwned(organizationId, id)
  if (!current) return err('communications/template-not-found')

  if (input.key && input.key !== current.key) {
    const existing = await repository.retrieveByKey(organizationId, input.key)
    if (existing && existing.id !== id)
      return err('communications/invalid-request')
  }

  const senderId =
    input.senderId === undefined ? current.senderId : input.senderId
  const senderValidation = await validateSender(organizationId, senderId)
  if (senderValidation.error)
    return { data: null, error: senderValidation.error }

  const categoryChanged =
    input.category !== undefined && input.category !== current.category
  const effectiveIsDefault =
    input.isDefault ?? (categoryChanged && current.isDefault ? true : undefined)

  const row = await repository.update({
    id,
    organizationId,
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.subject !== undefined ? { subject: input.subject } : {}),
    ...(input.html !== undefined ? { html: input.html } : {}),
    ...(input.text !== undefined ? { text: input.text } : {}),
    ...(input.senderId !== undefined ? { senderId: input.senderId } : {}),
    ...(effectiveIsDefault !== undefined
      ? { isDefault: effectiveIsDefault }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    now: toDbUnixSeconds(nowUnixSeconds()),
  })
  if (!row) return err('communications/template-not-found')
  return ok(toObject(row))
}

export async function renderTemplate(
  organizationId: string,
  id: string,
  input: RenderEmailTemplateInput
) {
  const template = await repository.retrieve(organizationId, id)
  if (!template) return err('communications/template-not-found')

  const rendered = renderEmailTemplate({
    subject: template.subject,
    html: template.html,
    text: template.text,
    variables: input.variables,
  })
  if (!rendered) return err('communications/template-render-failed')

  return ok({
    object: 'email_composition' as const,
    templateId: template.id,
    senderId: template.senderId,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })
}

export async function deleteTemplate(
  organizationId: string,
  id: string,
  actorId: string | null
) {
  const current = await repository.retrieveOwned(organizationId, id)
  if (!current) return err('communications/template-not-found')

  const deleted = await repository.softDelete({
    id,
    organizationId,
    deletedBy: actorId,
    deletionReason: 'Removed through Communications API.',
    now: toDbUnixSeconds(nowUnixSeconds()),
  })
  if (!deleted) return err('communications/template-not-found')

  return ok({ object: 'email_template' as const, id, deleted: true as const })
}
