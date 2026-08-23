import { nowUnixSeconds } from '@876/core/timestamps'
import { Prisma } from '@/db'
import { nextDocumentNumber } from '@/modules/documents'
import { appError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import type {
  PaymentIntentCancelParams,
  PaymentIntentCreateParams,
  PaymentIntentListQuery,
} from './schemas'
import { serializePaymentIntent } from './payment-intents.serializers'
import { paymentIntentsDb as prisma } from './payment-intents.repository'
const notFound = () =>
  appError('payment-intent/not-found', {
    message: 'Payment intent not found.',
    httpStatus: 404,
  })
const transition = (status: string) =>
  appError('payment-intent/invalid-transition', {
    message: `This action is not allowed while the payment intent is ${status}.`,
    httpStatus: 409,
  })
async function find(tenantId: string, id: string) {
  const row = await prisma.paymentIntent.findFirst({
    where: { tenantId, id },
    include: { paymentMethod: true },
  })
  if (!row) throw notFound()
  return row
}
export const paymentIntentsService = {
  async list(tenantId: string, query: PaymentIntentListQuery) {
    const rows = await prisma.paymentIntent.findMany({
      where: {
        tenantId,
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 25,
    })
    return {
      object: 'list' as const,
      data: rows.map(serializePaymentIntent),
      has_more: rows.length === (query.limit ?? 25),
      total_count: null,
      url: '/api/v1/payment-intents',
    }
  },
  async get(tenantId: string, id: string) {
    return serializePaymentIntent(await find(tenantId, id))
  },
  async create(
    tenantId: string,
    body: PaymentIntentCreateParams,
    idempotencyKey?: string
  ) {
    if (idempotencyKey) {
      const replay = await prisma.paymentIntent.findFirst({
        where: { tenantId, idempotencyKey },
      })
      if (replay)
        return { intent: serializePaymentIntent(replay), replayed: true }
    }
    const now = nowUnixSeconds()
    const id = generateId('PaymentIntent')
    try {
      const row = await prisma.paymentIntent.create({
        data: {
          id,
          tenantId,
          customerId: body.customerId,
          amount: body.amount,
          currency: body.currency,
          status: body.paymentMethodId
            ? 'REQUIRES_CONFIRMATION'
            : 'REQUIRES_PAYMENT_METHOD',
          captureMethod: body.captureMethod ?? 'AUTOMATIC',
          confirmationMethod: body.confirmationMethod ?? 'AUTOMATIC',
          paymentMethodId: body.paymentMethodId,
          invoiceId: body.invoiceId,
          subscriptionId: body.subscriptionId,
          paymentMethodTypes: body.paymentMethodTypes ?? [],
          description: body.description,
          receiptEmail: body.receiptEmail,
          metadata: body.metadata as Prisma.InputJsonValue | undefined,
          idempotencyKey: idempotencyKey ?? null,
          createdAt: now,
          updatedAt: now,
        },
      })
      return { intent: serializePaymentIntent(row), replayed: false }
    } catch (error) {
      if (
        idempotencyKey &&
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const replay = await prisma.paymentIntent.findFirst({
          where: { tenantId, idempotencyKey },
        })
        if (replay)
          return { intent: serializePaymentIntent(replay), replayed: true }
      }
      throw error
    }
  },
  async confirm(tenantId: string, id: string) {
    const intent = await find(tenantId, id)
    if (intent.status !== 'REQUIRES_CONFIRMATION')
      throw transition(intent.status)
    const method = intent.paymentMethod
    if (!method) throw transition(intent.status)
    if (method.type !== 'MANUAL') {
      await prisma.paymentIntent.update({
        where: { id },
        data: { status: 'PROCESSING', updatedAt: nowUnixSeconds() },
      })
      throw appError('payment/provider-unavailable', {
        message: 'No payment provider is configured for this payment method.',
        httpStatus: 503,
      })
    }
    const now = nowUnixSeconds()
    const mode = await prisma.paymentMode.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { isDefault: 'desc' },
    })
    const account = await prisma.bankAccount.findFirst({
      where: { tenantId, isActive: true, currency: intent.currency },
    })
    if (!mode || !account)
      throw appError('payment-intent/manual-settlement-unavailable', {
        message:
          'A payment mode and matching deposit account are required for manual settlement.',
        httpStatus: 422,
      })
    const number = await nextDocumentNumber(tenantId, 'PAYMENT', now)
    const paymentId = generateId('Payment')
    const attemptId = generateId('PaymentAttempt')
    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.create({
        data: {
          id: attemptId,
          tenantId,
          customerId: intent.customerId,
          paymentIntentId: id,
          paymentMethodId: intent.paymentMethodId,
          idempotencyKey: `intent:${id}:attempt:1`,
          status: 'SUCCEEDED',
          amount: intent.amount,
          currency: intent.currency,
          attemptedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      await tx.payment.create({
        data: {
          id: paymentId,
          tenantId,
          customerId: intent.customerId,
          paymentModeId: mode.id,
          depositAccountId: account.id,
          number,
          status: 'SUCCEEDED',
          paymentIntentId: id,
          paymentMethodId: intent.paymentMethodId,
          billingDetailsSnapshot:
            method.billingDetails === null
              ? Prisma.JsonNull
              : (method.billingDetails as Prisma.InputJsonValue),
          paymentMethodSnapshot: {
            type: method.type,
            displayLabel: method.displayLabel,
            card: method.card,
            bankAccount: method.bankAccount,
            manual: method.manual,
          } as Prisma.InputJsonValue,
          amount: intent.amount,
          // Nothing has been allocated to an invoice yet, so the whole amount
          // is unapplied — held as customer credit. Leaving this at zero would
          // record money that is neither applied nor available, and the
          // customer's receivable would be wrong by exactly this amount.
          // Allocating it against `intent.invoiceId` is a separate step.
          unappliedAmount: intent.amount,
          currency: intent.currency,
          paymentDate: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      return tx.paymentIntent.update({
        where: { id },
        data: {
          status: 'SUCCEEDED',
          amountReceived: intent.amount,
          attemptCount: { increment: 1 },
          latestPaymentId: paymentId,
          latestAttemptId: attemptId,
          updatedAt: now,
        },
      })
    })
    return serializePaymentIntent(updated)
  },
  async capture(tenantId: string, id: string) {
    const intent = await find(tenantId, id)
    if (intent.status !== 'REQUIRES_CAPTURE') throw transition(intent.status)
    const row = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        amountReceived: intent.amount,
        amountCapturable: 0n,
        updatedAt: nowUnixSeconds(),
      },
    })
    return serializePaymentIntent(row)
  },
  async cancel(tenantId: string, id: string, body: PaymentIntentCancelParams) {
    const intent = await find(tenantId, id)
    if (intent.status === 'SUCCEEDED' || intent.status === 'CANCELED')
      throw transition(intent.status)
    const now = nowUnixSeconds()
    const row = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: now,
        cancellationReason: body.cancellationReason,
        updatedAt: now,
      },
    })
    return serializePaymentIntent(row)
  },
}
