import { prisma } from '../../db/index.js'

export async function list(organizationId: string, limit = 50) {
  return prisma.emailDelivery.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  })
}

export async function retrieve(organizationId: string, id: string) {
  return prisma.emailDelivery.findFirst({ where: { organizationId, id } })
}

export async function retrieveByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
) {
  return prisma.emailDelivery.findUnique({
    where: {
      organizationId_idempotencyKey: { organizationId, idempotencyKey },
    },
  })
}

export async function retrieveByProviderMessageId(providerMessageId: string) {
  return prisma.emailDelivery.findUnique({ where: { providerMessageId } })
}

export async function createQueued(input: {
  id: string
  organizationId: string
  resourceType: string | null
  resourceId: string | null
  templateId: string | null
  senderId: string
  provider: string
  idempotencyKey: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  toRecipients: Array<Record<string, string>>
  ccRecipients: Array<Record<string, string>>
  bccRecipients: Array<Record<string, string>>
  subject: string
  html: string
  text: string | null
  createdBy: string | null
  now: bigint
}) {
  return prisma.emailDelivery.create({
    data: {
      id: input.id,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      templateId: input.templateId,
      senderId: input.senderId,
      provider: input.provider,
      idempotencyKey: input.idempotencyKey,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      replyTo: input.replyTo,
      toRecipients: input.toRecipients,
      ccRecipients: input.ccRecipients,
      bccRecipients: input.bccRecipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      status: 'queued',
      createdBy: input.createdBy,
      queuedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    },
  })
}

export async function markRetryQueued(input: {
  organizationId: string
  id: string
  now: bigint
}) {
  const updated = await prisma.emailDelivery.updateMany({
    where: { organizationId: input.organizationId, id: input.id },
    data: {
      status: 'queued',
      queuedAt: input.now,
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      updatedAt: input.now,
    },
  })
  if (updated.count !== 1)
    throw new Error('Email delivery disappeared while preparing a retry.')

  return prisma.emailDelivery.findUniqueOrThrow({ where: { id: input.id } })
}

export async function markSent(input: {
  organizationId: string
  id: string
  providerMessageId: string
  now: bigint
}) {
  const updated = await prisma.emailDelivery.updateMany({
    where: { organizationId: input.organizationId, id: input.id },
    data: {
      providerMessageId: input.providerMessageId,
      status: 'sent',
      sentAt: input.now,
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      updatedAt: input.now,
    },
  })
  if (updated.count !== 1)
    throw new Error('Email delivery disappeared after provider acceptance.')

  return prisma.emailDelivery.findUniqueOrThrow({ where: { id: input.id } })
}

export async function markFailed(input: {
  organizationId: string
  id: string
  failureCode: string
  failureMessage: string
  now: bigint
}) {
  const updated = await prisma.emailDelivery.updateMany({
    where: { organizationId: input.organizationId, id: input.id },
    data: {
      status: 'failed',
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
      failedAt: input.now,
      updatedAt: input.now,
    },
  })
  if (updated.count !== 1)
    throw new Error('Email delivery disappeared while recording failure.')

  return prisma.emailDelivery.findUniqueOrThrow({ where: { id: input.id } })
}

export async function recordProviderEvent(input: {
  id: string
  deliveryId: string
  providerEventId: string
  provider: string
  type: string
  occurredAt: bigint
  metadata: Record<string, unknown>
  status?: string
  timestampField?:
    | 'sentAt'
    | 'deliveredAt'
    | 'openedAt'
    | 'clickedAt'
    | 'bouncedAt'
    | 'complainedAt'
    | 'failedAt'
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.emailDeliveryEvent.findUnique({
      where: { providerEventId: input.providerEventId },
    })
    if (existing) return { inserted: false as const }

    await tx.emailDeliveryEvent.create({
      data: {
        id: input.id,
        deliveryId: input.deliveryId,
        provider: input.provider,
        providerEventId: input.providerEventId,
        type: input.type,
        occurredAt: input.occurredAt,
        metadata: input.metadata,
        createdAt: input.now,
      },
    })

    await tx.emailDelivery.update({
      where: { id: input.deliveryId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.timestampField
          ? { [input.timestampField]: input.occurredAt }
          : {}),
        updatedAt: input.now,
      },
    })

    return { inserted: true as const }
  })
}
