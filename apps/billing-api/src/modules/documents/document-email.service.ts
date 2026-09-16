import { formatMinorUnits } from '@876/core/money'
import { nowUnixSeconds } from '@876/core/timestamps'

import { appError, AppHttpError } from '@/http/errors'
import { communicationsService } from '@/lib/services/communications'
import { enabledCurrencyDecimalPlaces } from '@/modules/currencies'
import { tenantOrganization } from '@/modules/tenants'
import { idempotencyHash } from '@/platform/idempotency'
import type { IdempotencyContext } from '@/types/commerce'

import { resolveQuoteLifecycleTransition } from './quote-lifecycle'
import { invoices } from './repositories/invoices'
import { quotes } from './repositories/quotes'
import type {
  DocumentEmailPrepareQuery,
  DocumentEmailSendBody,
} from './schemas/email'
import { sendInvoiceWorkflow, transitionQuoteWorkflow } from './workflows'

type ResourceType = 'invoice' | 'quote'

type DocumentContext = {
  resourceType: ResourceType
  resourceId: string
  number: string
  currency: string
  total: bigint
  customerName: string
  customerEmail: string
  dueDate: string
  expiryDate: string
}

const invoiceSendableStatuses = new Set([
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
])

function isoDate(value: number | null | undefined, fallback: string): string {
  if (!value) return fallback
  return new Date(value * 1000).toISOString().slice(0, 10)
}

function missing(kind: ResourceType): AppHttpError {
  return new AppHttpError({
    code: `${kind}/not-found`,
    message: `${kind} not found.`,
    httpStatus: 404,
  })
}

function requireRecipient(email: string | null | undefined): string {
  if (!email) throw appError('billing/email-recipient-required')
  return email
}

function communicationsError(error: { code: string; message: string }): never {
  switch (error.code) {
    case 'communications/not-configured':
      throw appError('billing/email-not-configured')
    case 'communications/sender-not-found':
    case 'communications/sender-domain-not-verified':
    case 'communications/domain-not-verified':
      throw appError('billing/email-sender-required')
    case 'communications/template-not-found':
    case 'communications/template-render-failed':
      throw appError('billing/email-template-unavailable')
    case 'communications/recipient-required':
    case 'communications/recipient-invalid':
      throw appError('billing/email-recipient-required')
    case 'communications/idempotency-conflict':
      throw appError('billing/idempotency-conflict')
    case 'communications/provider-rejected':
      throw appError('billing/email-delivery-failed')
    case 'communications/provider-unavailable':
    case 'network/offline':
    case 'communications/invalid-response':
      throw appError('billing/email-unavailable')
    default:
      throw appError('billing/email-unavailable')
  }
}

async function invoiceContext(
  tenantId: string,
  invoiceId: string,
  sourceAppId?: string
): Promise<DocumentContext> {
  const invoice = await invoices.retrieve(tenantId, invoiceId, sourceAppId)
  if (!invoice) throw missing('invoice')
  if (!invoiceSendableStatuses.has(invoice.status))
    throw new AppHttpError({
      code: 'invoice/invalid-state',
      message:
        'Finalize the invoice before sending it by email. Voided and written-off invoices cannot be sent.',
      httpStatus: 409,
    })

  const customerName =
    invoice.customer?.companyName ?? invoice.customer?.name ?? 'Customer'
  const customerEmail = requireRecipient(invoice.customer?.email)

  return {
    resourceType: 'invoice',
    resourceId: invoice.id,
    number: invoice.number,
    currency: invoice.currency,
    total: invoice.totalAmount,
    customerName,
    customerEmail,
    dueDate: isoDate(invoice.dueAt, 'Upon receipt'),
    expiryDate: '',
  }
}

async function quoteContext(
  tenantId: string,
  quoteId: string
): Promise<DocumentContext> {
  const quote = await quotes.retrieve(tenantId, quoteId)
  if (!quote) throw missing('quote')
  const now = nowUnixSeconds()
  const transition = resolveQuoteLifecycleTransition(
    { status: quote.status, expiresAt: quote.expiresAt ?? null },
    'send',
    now
  )
  if (!transition) throw appError('billing/quote-invalid-state')

  return {
    resourceType: 'quote',
    resourceId: quote.id,
    number: quote.number,
    currency: quote.currency,
    total: quote.totalAmount,
    customerName: quote.customer?.name ?? 'Customer',
    customerEmail: requireRecipient(quote.customer?.email),
    dueDate: '',
    expiryDate: isoDate(quote.expiresAt, 'No expiry date'),
  }
}

async function contextFor(
  tenantId: string,
  resourceType: ResourceType,
  resourceId: string,
  sourceAppId?: string
) {
  return resourceType === 'invoice'
    ? invoiceContext(tenantId, resourceId, sourceAppId)
    : quoteContext(tenantId, resourceId)
}

async function renderVariables(
  tenantId: string,
  organizationName: string,
  document: DocumentContext
) {
  const decimalPlaces =
    (await enabledCurrencyDecimalPlaces(tenantId, document.currency)) ?? 2
  return {
    organizationName,
    customerName: document.customerName,
    customerEmail: document.customerEmail,
    documentId: document.resourceId,
    documentNumber: document.number,
    documentType: document.resourceType,
    currency: document.currency,
    documentTotal: formatMinorUnits(document.total, decimalPlaces),
    dueDate: document.dueDate,
    expiryDate: document.expiryDate,
  }
}

async function resolveSender(
  organizationId: string,
  senderId: string | undefined,
  templateSenderId: string | null
) {
  const result = await communicationsService().senders.list(organizationId)
  if (result.error) communicationsError(result.error)

  const activeSenders = result.data.data.filter((candidate) => candidate.isActive)
  const requestedId = senderId ?? templateSenderId ?? undefined
  const sender = requestedId
    ? activeSenders.find((candidate) => candidate.id === requestedId)
    : activeSenders.find((candidate) => candidate.isDefault)

  if (!sender) throw appError('billing/email-sender-required')
  return { sender, activeSenders }
}

export async function prepareDocumentEmail(
  tenantId: string,
  resourceType: ResourceType,
  resourceId: string,
  query: DocumentEmailPrepareQuery,
  sourceAppId?: string
) {
  const [organization, document] = await Promise.all([
    tenantOrganization(tenantId),
    contextFor(tenantId, resourceType, resourceId, sourceAppId),
  ])
  const communications = communicationsService()
  const [templateResult, templateListResult] = await Promise.all([
    communications.templates.resolve(
      organization.organizationId,
      resourceType,
      query.templateId ? { templateId: query.templateId } : {}
    ),
    communications.templates.list(organization.organizationId),
  ])
  if (templateResult.error) communicationsError(templateResult.error)
  if (templateListResult.error) communicationsError(templateListResult.error)

  const { sender, activeSenders } = await resolveSender(
    organization.organizationId,
    query.senderId,
    templateResult.data.senderId
  )
  const rendered = await communications.templates.render(
    organization.organizationId,
    templateResult.data.id,
    {
      variables: await renderVariables(tenantId, organization.name, document),
    }
  )
  if (rendered.error) communicationsError(rendered.error)

  return {
    object: 'document_email_composition' as const,
    resourceType,
    resourceId,
    sender: {
      id: sender.id,
      name: sender.name,
      email: sender.email,
      replyTo: sender.replyTo,
    },
    senderOptions: activeSenders.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      replyTo: candidate.replyTo,
      isDefault: candidate.isDefault,
    })),
    to: [{ email: document.customerEmail, name: document.customerName }],
    cc: [],
    bcc: [],
    templateId: templateResult.data.id,
    templateOptions: templateListResult.data.data
      .filter(
        (candidate) => candidate.isActive && candidate.category === resourceType
      )
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        isDefault: candidate.isDefault,
        isSystem: candidate.isSystem,
        senderId: candidate.senderId,
      })),
    subject: rendered.data.subject,
    html: rendered.data.html,
    text: rendered.data.text,
  }
}

async function recordLifecycleSend(
  tenantId: string,
  resourceType: ResourceType,
  resourceId: string,
  idempotency: IdempotencyContext
) {
  const result =
    resourceType === 'invoice'
      ? await sendInvoiceWorkflow(tenantId, resourceId, idempotency)
      : await transitionQuoteWorkflow(
          tenantId,
          resourceId,
          'send',
          idempotency
        )

  if (result.error === null) return
  if (result.code)
    throw appError(result.code, {
      message: result.error,
      httpStatus: result.status ?? 500,
    })
  throw new AppHttpError({
    code: `${resourceType}/invalid-state`,
    message: result.error,
    httpStatus: result.status ?? 500,
  })
}

export async function sendDocumentEmail(
  tenantId: string,
  resourceType: ResourceType,
  resourceId: string,
  body: DocumentEmailSendBody,
  idempotency: IdempotencyContext,
  options: { sourceAppId?: string; actorId?: string } = {}
) {
  const [organization] = await Promise.all([
    tenantOrganization(tenantId),
    // Validate ownership and lifecycle before crossing the service boundary.
    contextFor(tenantId, resourceType, resourceId, options.sourceAppId),
  ])

  const deliveryKey = `billing-email:${idempotencyHash(
    JSON.stringify({
      tenantId,
      resourceType,
      resourceId,
      key: idempotency.key,
    })
  )}`

  const delivery = await communicationsService().deliveries.create(
    organization.organizationId,
    {
      senderId: body.senderId,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text ?? undefined,
      resourceType,
      resourceId,
      templateId: body.templateId ?? undefined,
      idempotencyKey: deliveryKey,
    },
    options.actorId ? { actorId: options.actorId } : {}
  )
  if (delivery.error) communicationsError(delivery.error)

  // Provider acceptance/replay happens first. If Billing state changes in the
  // tiny cross-service window, a retry reuses the exact Communications delivery
  // via deliveryKey and only retries this lifecycle record; it never sends a
  // second external email.
  await recordLifecycleSend(tenantId, resourceType, resourceId, idempotency)

  return {
    object: 'document_email_delivery' as const,
    resourceType,
    resourceId,
    deliveryId: delivery.data.id,
    providerMessageId: delivery.data.providerMessageId,
    status: delivery.data.status,
    sentAt: delivery.data.sentAt,
  }
}
