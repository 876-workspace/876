import { AppHttpError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'

import { paymentModes } from './repositories/payment-modes'
import { payments } from './repositories/payments'
import { refunds } from './repositories/refunds'
import type { ServiceResult } from './schemas/api'
import type {
  PaymentApplyParams,
  PaymentCreateParams,
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
  PaymentUpdateParams,
} from './schemas/payment'
import type { RefundCreateParams } from './schemas/refund'
import {
  paymentList,
  serializePayment,
  serializePaymentMode,
  serializeRefund,
} from './payments.serializers'

async function unwrap<T>(
  result: Awaited<ServiceResult<T>>,
  kind: string
): Promise<T> {
  if (result.error === null) return result.data
  const status = result.status ?? 500
  throw new AppHttpError({
    code:
      status === 404
        ? `${kind}/not-found`
        : status === 409
          ? `${kind}/conflict`
          : status === 422
            ? 'validation/invalid-request'
            : status === 403
              ? 'auth/forbidden'
              : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}
function notFound(kind: string) {
  return new AppHttpError({
    code: `${kind}/not-found`,
    message: `${kind.replace('_', ' ')} not found.`,
    httpStatus: 404,
  })
}

export const paymentsService = {
  async listModes(tenantId: string, url = '/api/v1/payments/modes') {
    return paymentList(
      'payment_mode',
      await paymentModes.list(tenantId),
      url,
      serializePaymentMode
    )
  },
  async getMode(tenantId: string, id: string) {
    const row = await paymentModes.retrieve(tenantId, id)
    if (!row) throw notFound('payment_mode')
    return serializePaymentMode(row)
  },
  async createMode(tenantId: string, body: PaymentModeCreateParams) {
    return {
      object: 'payment_mode',
      ...(await unwrap(
        await paymentModes.create(tenantId, body),
        'payment_mode'
      )),
    }
  },
  async updateMode(
    tenantId: string,
    id: string,
    body: PaymentModeUpdateParams
  ) {
    return {
      object: 'payment_mode',
      ...(await unwrap(
        await paymentModes.update(tenantId, id, body),
        'payment_mode'
      )),
    }
  },
  async deleteMode(tenantId: string, id: string) {
    return {
      object: 'payment_mode',
      ...(await unwrap(
        await paymentModes.delete(tenantId, id),
        'payment_mode'
      )),
      deleted: true,
    }
  },
  async listPayments(
    tenantId: string,
    sourceAppId?: string,
    url = '/api/v1/payments'
  ) {
    return paymentList(
      'payment',
      await payments.list(tenantId, sourceAppId),
      url,
      serializePayment
    )
  },
  async getPayment(tenantId: string, id: string, sourceAppId?: string) {
    const row = await payments.retrieve(tenantId, id, sourceAppId)
    if (!row) throw notFound('payment')
    return serializePayment(row)
  },
  async createPayment(
    tenantId: string,
    body: PaymentCreateParams,
    attribution?: IntegrationAttribution | null
  ) {
    const result = await unwrap(
      await payments.create(tenantId, body, attribution ?? undefined),
      'payment'
    )
    return {
      resource: { object: 'payment', id: result.id },
      replayed: result.replayed === true,
    }
  },
  async updatePayment(tenantId: string, id: string, body: PaymentUpdateParams) {
    return {
      object: 'payment',
      ...(await unwrap(await payments.update(tenantId, id, body), 'payment')),
    }
  },
  async applyPayment(tenantId: string, id: string, body: PaymentApplyParams) {
    return {
      object: 'payment',
      ...(await unwrap(await payments.apply(tenantId, id, body), 'payment')),
    }
  },
  async deletePayment(tenantId: string, id: string) {
    return {
      object: 'payment',
      ...(await unwrap(await payments.delete(tenantId, id), 'payment')),
      deleted: true,
    }
  },
  async listRefunds(tenantId: string) {
    return paymentList(
      'refund',
      await refunds.list(tenantId),
      '/api/v1/refunds',
      serializeRefund
    )
  },
  async createRefund(tenantId: string, body: RefundCreateParams) {
    return {
      object: 'refund',
      ...(await unwrap(await refunds.create(tenantId, body), 'refund')),
    }
  },
}
