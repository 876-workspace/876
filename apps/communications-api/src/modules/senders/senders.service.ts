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
  type CreateEmailSenderValues,
  type EnsureManagedSenderInput,
  type EmailSender,
  type UpdateEmailSenderInput,
} from '../../types/communications.js'
import {
  managedLocalPartCandidates,
  managedSenderAddress,
} from './senders.managed.js'
import * as repository from './senders.repository.js'
import { getSettings } from '../../config/index.js'

type SenderRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function toObject(row: SenderRow): EmailSender {
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
): Promise<ServiceResult<EmailSender[]>> {
  const rows = await repository.list(organizationId)
  return ok(rows.map(toObject))
}

export async function retrieveSender(
  organizationId: string,
  id: string
): Promise<ServiceResult<EmailSender>> {
  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/sender-not-found')
  return ok(toObject(row))
}

/**
 * Provision the organization's free, zero-setup sending identity.
 *
 * Every organization gets one so that sending works on day one with no DNS work
 * — the same default Zoho applies. It is backed by the single platform-verified
 * domain, so this costs no DNS write and no provider call.
 *
 * Idempotent: an organization that already has a `managed` sender gets it back
 * unchanged, because the address is durable evidence on every delivery already
 * sent from it.
 *
 * The address is server-derived from the organization's durable slug. The caller
 * supplies the organization's identity because Communications references
 * organizations by opaque id and does not read the identity store.
 */
export async function ensureManagedSender(
  organizationId: string,
  input: EnsureManagedSenderInput
): Promise<ServiceResult<EmailSender>> {
  const existing = await repository.retrieveManaged(organizationId)
  if (existing) return ok(toObject(existing))

  const platformSendingDomain = getSettings().platformSendingDomain
  if (!platformSendingDomain) return err('communications/invalid-request')

  const candidates = managedLocalPartCandidates({
    organizationId,
    organizationSlug: input.organizationSlug,
  })

  let email: string | null = null
  for (const candidate of candidates) {
    const address = managedSenderAddress(candidate, platformSendingDomain)
    const owner = await repository.findOwnerOfEmail(address)
    if (!owner) {
      email = address
      break
    }
    // Another organization already sends from this address. Fall through to the
    // next deterministic candidate rather than ever reusing it.
    if (owner.organizationId === organizationId) {
      email = address
      break
    }
  }

  if (!email) return err('communications/sender-already-exists')

  const activeCount = await repository.countActive(organizationId)
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('sender'),
    organizationId,
    domainId: null,
    name: input.organizationName.trim(),
    email,
    replyTo: input.replyTo?.trim().toLowerCase() ?? null,
    kind: 'managed',
    isDefault: activeCount === 0,
    now,
  })

  return ok(toObject(row))
}

export async function createSender(
  organizationId: string,
  input: CreateEmailSenderValues
): Promise<ServiceResult<EmailSender>> {
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
): Promise<ServiceResult<EmailSender>> {
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
