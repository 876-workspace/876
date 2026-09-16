import { err, ok, type ServiceResult } from '../../http/result.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import { getEmailProvider, type EmailProvider } from '../../providers/index.js'
import { providerErrorToAppError } from '../../providers/provider-errors.js'
import {
  emailDeliveryStatusSchema,
  emailRecipientSchema,
  type CreateEmailDeliveryInput,
  type EmailDelivery,
  type EmailRecipient,
} from '../../types/communications.js'
import { retrieveDomain } from '../domains/domains.service.js'
import { retrieveSender } from '../senders/senders.service.js'
import { retrieveTemplate } from '../templates/templates.service.js'
import * as repository from './deliveries.repository.js'

type DeliveryRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function parseRecipients(value: unknown): EmailRecipient[] {
  return emailRecipientSchema.array().parse(value)
}

function toObject(row: DeliveryRow): EmailDelivery {
  if (row.provider !== 'resend')
    throw new Error(`Unsupported email provider: ${row.provider}`)

  return {
    object: 'email_delivery',
    id: row.id,
    organizationId: row.organizationId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    templateId: row.templateId,
    senderId: row.senderId,
    provider: 'resend',
    providerMessageId: row.providerMessageId,
    idempotencyKey: row.idempotencyKey,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    to: parseRecipients(row.toRecipients),
    cc: parseRecipients(row.ccRecipients),
    bcc: parseRecipients(row.bccRecipients),
    subject: row.subject,
    status: emailDeliveryStatusSchema.parse(row.status),
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    queuedAt: nullableFromDbUnixSeconds(row.queuedAt),
    sentAt: nullableFromDbUnixSeconds(row.sentAt),
    deliveredAt: nullableFromDbUnixSeconds(row.deliveredAt),
    openedAt: nullableFromDbUnixSeconds(row.openedAt),
    clickedAt: nullableFromDbUnixSeconds(row.clickedAt),
    bouncedAt: nullableFromDbUnixSeconds(row.bouncedAt),
    complainedAt: nullableFromDbUnixSeconds(row.complainedAt),
    failedAt: nullableFromDbUnixSeconds(row.failedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

function formatAddress(name: string | undefined, email: string): string {
  if (!name) return email
  const escaped = name.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return `"${escaped}" <${email}>`
}

function recipientsEqual(left: unknown, right: EmailRecipient[]): boolean {
  try {
    return JSON.stringify(parseRecipients(left)) === JSON.stringify(right)
  } catch {
    return false
  }
}

function matchesExisting(
  row: DeliveryRow,
  input: CreateEmailDeliveryInput,
  sender: { id: string; name: string; email: string; replyTo: string | null }
): boolean {
  return (
    row.senderId === sender.id &&
    row.fromName === sender.name &&
    row.fromEmail === sender.email &&
    row.replyTo === sender.replyTo &&
    row.subject === input.subject &&
    row.html === input.html &&
    row.text === (input.text ?? null) &&
    row.resourceType === (input.resourceType ?? null) &&
    row.resourceId === (input.resourceId ?? null) &&
    row.templateId === (input.templateId ?? null) &&
    recipientsEqual(row.toRecipients, input.to) &&
    recipientsEqual(row.ccRecipients, input.cc) &&
    recipientsEqual(row.bccRecipients, input.bcc)
  )
}

async function validateSenderForDelivery(
  organizationId: string,
  senderId: string
) {
  const sender = await retrieveSender(organizationId, senderId)
  if (sender.error) return sender
  if (!sender.data.isActive) return err('communications/sender-not-found')

  if (sender.data.kind === 'custom-domain') {
    if (!sender.data.domainId)
      return err('communications/sender-domain-not-verified')

    const domain = await retrieveDomain(organizationId, sender.data.domainId)
    if (domain.error) return { data: null, error: domain.error }
    if (domain.data.status !== 'verified')
      return err('communications/sender-domain-not-verified')
  }

  return sender
}

async function sendQueuedDelivery(
  organizationId: string,
  row: DeliveryRow,
  provider: EmailProvider
): Promise<ServiceResult<EmailDelivery>> {
  const now = toDbUnixSeconds(nowUnixSeconds())
  const providerInput = {
    from: formatAddress(row.fromName, row.fromEmail),
    to: parseRecipients(row.toRecipients).map((recipient) =>
      formatAddress(recipient.name, recipient.email)
    ),
    cc: parseRecipients(row.ccRecipients).map((recipient) =>
      formatAddress(recipient.name, recipient.email)
    ),
    bcc: parseRecipients(row.bccRecipients).map((recipient) =>
      formatAddress(recipient.name, recipient.email)
    ),
    ...(row.replyTo ? { replyTo: row.replyTo } : {}),
    subject: row.subject,
    html: row.html,
    ...(row.text ? { text: row.text } : {}),
    idempotencyKey: row.idempotencyKey,
  }

  try {
    const result = await provider.send(providerInput)
    const sent = await repository.markSent({
      organizationId,
      id: row.id,
      providerMessageId: result.providerMessageId,
      now,
    })
    return ok(toObject(sent))
  } catch (error) {
    const appError = providerErrorToAppError(error)
    await repository.markFailed({
      organizationId,
      id: row.id,
      failureCode: appError.code,
      failureMessage: appError.message,
      now,
    })
    return { data: null, error: appError }
  }
}


function resolveProvider(provided?: EmailProvider): ServiceResult<EmailProvider> {
  if (provided) return ok(provided)
  try {
    return ok(getEmailProvider())
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }
}

export async function listDeliveries(
  organizationId: string,
  limit?: number
): Promise<ServiceResult<EmailDelivery[]>> {
  const rows = await repository.list(organizationId, limit)
  return ok(rows.map(toObject))
}

export async function retrieveDelivery(
  organizationId: string,
  id: string
): Promise<ServiceResult<EmailDelivery>> {
  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/delivery-not-found')
  return ok(toObject(row))
}

export async function createDelivery(
  organizationId: string,
  input: CreateEmailDeliveryInput,
  actorId: string | null,
  provider?: EmailProvider
): Promise<ServiceResult<EmailDelivery>> {
  const activeProvider = resolveProvider(provider)
  if (activeProvider.error) return { data: null, error: activeProvider.error }
  const emailProvider = activeProvider.data

  const senderResult = await validateSenderForDelivery(
    organizationId,
    input.senderId
  )
  if (senderResult.error) return { data: null, error: senderResult.error }
  const sender = senderResult.data

  if (input.templateId) {
    const template = await retrieveTemplate(organizationId, input.templateId)
    if (template.error) return { data: null, error: template.error }
  }

  let delivery = await repository.retrieveByIdempotencyKey(
    organizationId,
    input.idempotencyKey
  )

  if (delivery) {
    if (!matchesExisting(delivery, input, sender))
      return err('communications/idempotency-conflict')

    if (delivery.providerMessageId || !['queued', 'failed'].includes(delivery.status))
      return ok(toObject(delivery))

    delivery = await repository.markRetryQueued({
      organizationId,
      id: delivery.id,
      now: toDbUnixSeconds(nowUnixSeconds()),
    })
    return sendQueuedDelivery(organizationId, delivery, emailProvider)
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  try {
    delivery = await repository.createQueued({
      id: generateId('delivery'),
      organizationId,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      templateId: input.templateId ?? null,
      senderId: sender.id,
      provider: emailProvider.name,
      idempotencyKey: input.idempotencyKey,
      fromName: sender.name,
      fromEmail: sender.email,
      replyTo: sender.replyTo,
      toRecipients: input.to.map((recipient) => ({ ...recipient })),
      ccRecipients: input.cc.map((recipient) => ({ ...recipient })),
      bccRecipients: input.bcc.map((recipient) => ({ ...recipient })),
      subject: input.subject,
      html: input.html,
      text: input.text ?? null,
      createdBy: actorId,
      now,
    })
  } catch (error) {
    const raced = await repository.retrieveByIdempotencyKey(
      organizationId,
      input.idempotencyKey
    )
    if (!raced || !matchesExisting(raced, input, sender)) throw error
    delivery = raced
  }

  if (delivery.providerMessageId || !['queued', 'failed'].includes(delivery.status))
    return ok(toObject(delivery))

  return sendQueuedDelivery(organizationId, delivery, emailProvider)
}
