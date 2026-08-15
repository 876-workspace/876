import { Prisma } from '@/db'
import type {
  PaymentAttempt,
  PaymentProviderEvent,
  ProviderEventStatus,
} from '@/db'
import { prisma } from '@/db/client'
import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { isUniqueConstraintError } from '@/platform/prisma-errors'
import { nowUnixSeconds } from '@/platform/timestamps'

type ProviderEventOutcome = 'processed' | 'ignored' | 'failed'
type PaymentAttemptOutcome =
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export interface RecordProviderEventInput {
  tenantId: string
  connectionId: string
  externalEventId: string
  eventType: string
  payload?: Prisma.InputJsonValue | null
  occurredAt?: number | null
  receivedAt?: number
}

export interface StartPaymentAttemptInput {
  tenantId: string
  customerId: string
  amount: bigint
  currency: string
  idempotencyKey: string
  connectionId?: string | null
  invoiceId?: string | null
  subscriptionId?: string | null
  attemptedAt?: number
}

export interface CompletePaymentAttemptInput {
  tenantId: string
  attemptId: string
  outcome: PaymentAttemptOutcome
  externalReference?: string | null
  failureCode?: string | null
  failureMessage?: string | null
  providerResponseCode?: string | null
  completedAt?: number
}

type LockedProviderEvent = Pick<PaymentProviderEvent, 'id' | 'status'>
type LockedPaymentAttempt = Pick<
  PaymentAttempt,
  | 'id'
  | 'status'
  | 'customerId'
  | 'invoiceId'
  | 'amount'
  | 'currency'
>

function invalid(message: string): AppHttpError {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

function providerEventNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'payment-provider-event/not-found',
    message: 'Payment provider event not found.',
    httpStatus: 404,
  })
}

function paymentAttemptNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'payment-attempt/not-found',
    message: 'Payment attempt not found.',
    httpStatus: 404,
  })
}

async function requireActiveConnection(
  tx: Prisma.TransactionClient,
  tenantId: string,
  connectionId: string
): Promise<void> {
  const connection = await tx.paymentProviderConnection.findFirst({
    where: { id: connectionId, tenantId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!connection)
    throw new AppHttpError({
      code: 'payment-provider-connection/not-found',
      message: 'An active payment provider connection was not found.',
      httpStatus: 404,
    })
}

/** Durably receives a provider event and deduplicates it by provider ID. */
export async function recordProviderEvent(
  input: RecordProviderEventInput
): Promise<{ id: string; duplicate: boolean }> {
  if (!input.externalEventId || !input.eventType)
    throw invalid('Provider event ID and type are required.')

  return prisma.$transaction(async (tx) => {
    await requireActiveConnection(tx, input.tenantId, input.connectionId)
    const now = input.receivedAt ?? nowUnixSeconds()
    try {
      const event = await tx.paymentProviderEvent.create({
        data: {
          id: generateId('PaymentProviderEvent'),
          tenantId: input.tenantId,
          connectionId: input.connectionId,
          externalEventId: input.externalEventId,
          eventType: input.eventType,
          status: 'RECEIVED',
          ...(input.payload === null
            ? { payload: Prisma.JsonNull }
            : input.payload === undefined
              ? {}
              : { payload: input.payload }),
          occurredAt: input.occurredAt ?? null,
          receivedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true },
      })
      return { id: event.id, duplicate: false }
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      const existing = await tx.paymentProviderEvent.findUnique({
        where: {
          connectionId_externalEventId: {
            connectionId: input.connectionId,
            externalEventId: input.externalEventId,
          },
        },
        select: { id: true },
      })
      if (!existing)
        throw new Error(
          'Provider event deduplication did not return the stored event.'
        )
      return { id: existing.id, duplicate: true }
    }
  })
}

/** Atomically claims unprocessed inbox rows for one provider worker. */
export async function claimProviderEvents(
  limit = 100,
  claimedAt = nowUnixSeconds()
): Promise<PaymentProviderEvent[]> {
  if (limit < 1 || limit > 500)
    throw invalid('Provider event limit must be between 1 and 500.')

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM billing_payment_provider_events
      WHERE status = 'RECEIVED'::"BillingProviderEventStatus"
      ORDER BY received_at, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `
    if (rows.length === 0) return []
    const ids = rows.map(({ id }) => id)
    await tx.paymentProviderEvent.updateMany({
      where: { id: { in: ids }, status: 'RECEIVED' },
      data: { status: 'PROCESSING', updatedAt: claimedAt },
    })
    return tx.paymentProviderEvent.findMany({
      where: { id: { in: ids } },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    })
  })
}

/** Completes a previously claimed provider event under a row lock. */
export async function completeProviderEvent(input: {
  tenantId: string
  eventId: string
  outcome: ProviderEventOutcome
  errorMessage?: string | null
  completedAt?: number
}): Promise<PaymentProviderEvent> {
  return prisma.$transaction(async (tx) => {
    const [event] = await tx.$queryRaw<LockedProviderEvent[]>`
      SELECT id, status
      FROM billing_payment_provider_events
      WHERE id = ${input.eventId} AND tenant_id = ${input.tenantId}
      FOR UPDATE
    `
    if (!event) throw providerEventNotFound()
    if (event.status !== 'PROCESSING')
      throw new AppHttpError({
        code: 'payment-provider-event/invalid-state',
        message: 'Only a claimed provider event can be completed.',
        httpStatus: 409,
      })

    const now = input.completedAt ?? nowUnixSeconds()
    return tx.paymentProviderEvent.update({
      where: { id: event.id },
      data: {
        status: {
          processed: 'PROCESSED',
          ignored: 'IGNORED',
          failed: 'FAILED',
        }[input.outcome] as ProviderEventStatus,
        errorMessage: input.errorMessage?.slice(0, 1_000) ?? null,
        processedAt: now,
        updatedAt: now,
      },
    })
  })
}

function validateAttemptReplay(
  attempt: LockedPaymentAttempt,
  input: StartPaymentAttemptInput
): void {
  if (
    attempt.customerId !== input.customerId ||
    attempt.invoiceId !== (input.invoiceId ?? null) ||
    attempt.amount !== input.amount ||
    attempt.currency !== input.currency.toUpperCase()
  )
    throw new AppHttpError({
      code: 'payment-attempt/idempotency-conflict',
      message:
        'The payment-attempt idempotency key was already used with different financial terms.',
      httpStatus: 409,
    })
}

/** Starts one provider payment attempt with durable idempotency. */
export async function startPaymentAttempt(
  input: StartPaymentAttemptInput
): Promise<{ attempt: PaymentAttempt; replayed: boolean }> {
  if (
    input.amount <= 0n ||
    input.currency.length !== 3 ||
    !input.idempotencyKey
  )
    throw invalid(
      'A positive amount, three-letter currency, and idempotency key are required.'
    )

  return prisma.$transaction(async (tx) => {
    const where = {
      tenantId_idempotencyKey: {
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
      },
    }
    const existing = await tx.paymentAttempt.findUnique({ where })
    if (existing) {
      validateAttemptReplay(existing, input)
      return { attempt: existing, replayed: true }
    }
    if (input.connectionId)
      await requireActiveConnection(tx, input.tenantId, input.connectionId)

    const now = input.attemptedAt ?? nowUnixSeconds()
    try {
      const attempt = await tx.paymentAttempt.create({
        data: {
          id: generateId('PaymentAttempt'),
          tenantId: input.tenantId,
          connectionId: input.connectionId ?? null,
          customerId: input.customerId,
          invoiceId: input.invoiceId ?? null,
          subscriptionId: input.subscriptionId ?? null,
          idempotencyKey: input.idempotencyKey,
          status: 'PROCESSING',
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          attemptedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      return { attempt, replayed: false }
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      const replay = await tx.paymentAttempt.findUnique({ where })
      if (!replay)
        throw new Error(
          'Payment-attempt deduplication did not return the stored attempt.'
        )
      validateAttemptReplay(replay, input)
      return { attempt: replay, replayed: true }
    }
  })
}

/** Moves a payment attempt from a live state to its provider outcome. */
export async function completePaymentAttempt(
  input: CompletePaymentAttemptInput
): Promise<PaymentAttempt> {
  return prisma.$transaction(async (tx) => {
    const [attempt] = await tx.$queryRaw<LockedPaymentAttempt[]>`
      SELECT id, status, customer_id AS "customerId",
             invoice_id AS "invoiceId", amount, currency
      FROM billing_payment_attempts
      WHERE id = ${input.attemptId} AND tenant_id = ${input.tenantId}
      FOR UPDATE
    `
    if (!attempt) throw paymentAttemptNotFound()

    const status = {
      requires_action: 'REQUIRES_ACTION',
      succeeded: 'SUCCEEDED',
      failed: 'FAILED',
      canceled: 'CANCELED',
    }[input.outcome] as PaymentAttempt['status']
    if (attempt.status === status)
      return tx.paymentAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      })
    if (!['PROCESSING', 'REQUIRES_ACTION'].includes(attempt.status))
      throw new AppHttpError({
        code: 'payment-attempt/invalid-state',
        message: 'A terminal payment attempt cannot change outcome.',
        httpStatus: 409,
      })

    const now = input.completedAt ?? nowUnixSeconds()
    return tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        externalReference: input.externalReference ?? null,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage?.slice(0, 1_000) ?? null,
        providerResponseCode: input.providerResponseCode ?? null,
        completedAt: status === 'REQUIRES_ACTION' ? null : now,
        updatedAt: now,
      },
    })
  })
}
