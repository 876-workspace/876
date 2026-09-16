import { err, ok, type ServiceResult } from '../../http/result.js'
import { retrieveDomain } from '../domains/domains.service.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import {
  emailSenderKindSchema,
  type CreateEmailSenderInput,
  type EmailSenderObject,
  type UpdateEmailSenderInput,
} from '../../types/communications.js'
import * as repository from './senders.repository.js'

type SenderRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function toObject(row: SenderRow): EmailSenderObject {
  return {
    object: 'email_sender',
    id: row.id,
    organizationId: row.organizationId,
    domainId: row.domainId,
    name: row.name,
    email: row.email,
    replyTo: row.replyTo,
    kind: emailSenderKindSchema.parse(row.kind),
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

async function validateCustomDomain(
  organizationId: string,
  domainId: string | null | undefined,
  email: string
): Promise<ServiceResult<true>> {
  if (!domainId) return err('communications/sender-domain-not-verified')

  const domainResult = await retrieveDomain(organizationId, domainId)
  if (domainResult.error) return { data: null, error: domainResult.error }
  if (domainResult.data.status !== 'verified')
    return err('communications/sender-domain-not-verified')

  const addressDomain = email.split('@').at(-1)?.toLowerCase()
  if (addressDomain !== domainResult.data.name.toLowerCase())
    return err('communications/invalid-request')

  return ok(true)
}

export async function listSenders(
  organizationId: string
): Promise<ServiceResult<EmailSenderObject[]>> {
  const rows = await repository.list(organizationId)
  return ok(rows.map(toObject))
}

export async function retrieveSender(
  organizationId: string,
  id: string
): Promise<ServiceResult<EmailSenderObject>> {
  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/sender-not-found')
  return ok(toObject(row))
}

export async function createSender(
  organizationId: string,
  input: CreateEmailSenderInput
): Promise<ServiceResult<EmailSenderObject>> {
  if (input.kind !== 'custom-domain')
    return err('communications/invalid-request')

  const email = input.email.trim().toLowerCase()
  const existing = await repository.retrieveByEmail(organizationId, email)
  if (existing) return err('communications/sender-already-exists')

  const domainValidation = await validateCustomDomain(
    organizationId,
    input.domainId,
    email
  )
  if (domainValidation.error)
    return { data: null, error: domainValidation.error }

  const activeCount = await repository.countActive(organizationId)
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('sender'),
    organizationId,
    domainId: input.domainId ?? null,
    name: input.name,
    email,
    replyTo: input.replyTo?.trim().toLowerCase() ?? null,
    kind: input.kind,
    isDefault: input.isDefault || activeCount === 0,
    now,
  })

  return ok(toObject(row))
}

export async function updateSender(
  organizationId: string,
  id: string,
  input: UpdateEmailSenderInput
): Promise<ServiceResult<EmailSenderObject>> {
  const current = await repository.retrieve(organizationId, id)
  if (!current) return err('communications/sender-not-found')

  if (current.isDefault && input.isDefault === false && input.isActive !== false)
    return err('communications/default-sender-required')

  const activeCount = await repository.countActive(organizationId)
  if (current.isDefault && input.isActive === false && activeCount > 1)
    return err('communications/default-sender-required')

  const email = input.email?.trim().toLowerCase() ?? current.email
  const domainId =
    input.domainId === undefined ? current.domainId : input.domainId

  const domainValidation = await validateCustomDomain(
    organizationId,
    domainId,
    email
  )
  if (domainValidation.error)
    return { data: null, error: domainValidation.error }

  if (email !== current.email) {
    const existing = await repository.retrieveByEmail(organizationId, email)
    if (existing && existing.id !== id)
      return err('communications/sender-already-exists')
  }

  const row = await repository.update({
    id,
    organizationId,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email } : {}),
    ...(input.replyTo !== undefined
      ? { replyTo: input.replyTo?.trim().toLowerCase() ?? null }
      : {}),
    ...(input.domainId !== undefined ? { domainId } : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    now: toDbUnixSeconds(nowUnixSeconds()),
  })
  return ok(toObject(row))
}

export async function deleteSender(
  organizationId: string,
  id: string,
  actorId: string | null
) {
  const current = await repository.retrieve(organizationId, id)
  if (!current) return err('communications/sender-not-found')

  const activeCount = await repository.countActive(organizationId)
  if (current.isDefault && activeCount > 1)
    return err('communications/default-sender-required')

  await repository.softDelete({
    id,
    organizationId,
    deletedBy: actorId,
    deletionReason: 'Removed through Communications API.',
    now: toDbUnixSeconds(nowUnixSeconds()),
  })
  return ok({ object: 'email_sender' as const, id, deleted: true as const })
}
