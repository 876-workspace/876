import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { SubscriptionChargeCreateParams } from '@/types/subscription'

import { calculateInvoiceChargeLines } from '../billing-engine'
import { recomputeCustomerAr } from '../customers/ar'
import { nextDocumentNumber } from '../documents/numbers'
import { settleWithAvailableCredits } from '../invoices/settlement'
import { recordLedgerEntry } from '../ledger'
import { resolveDueAt } from '../payment-terms'
import { err, ok } from '../result'

export async function createCharge(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionChargeCreateParams,
  actorUserId?: string
): ServiceResult<{ id: string; invoiceId: string | null }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: {
      customer: { select: { paymentTermId: true } },
      items: {
        where: { isActive: true },
        select: {
          currency: true,
          price: { select: { planId: true } },
        },
      },
    },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (!['ACTIVE', 'TRIALING'].includes(subscription.status))
    return err('Charges can only be added to an active subscription.', 409)
  if (subscription.status === 'PAUSED')
    return err('Resume the subscription before adding a charge.', 409)

  const subscriptionCurrency = subscription.items.find(
    (item) => item.currency !== null
  )?.currency
  if (!subscriptionCurrency)
    return err('The subscription does not have a billing currency.', 409)
  if (subscriptionCurrency !== params.currency)
    return err('The charge must use the subscription currency.', 422)
  if (subscription.taxBehavior !== params.taxBehavior)
    return err('The charge must use the subscription tax behavior.', 422)

  const [addon, price] = await Promise.all([
    params.addonId
      ? prisma.addon.findFirst({
          where: { id: params.addonId, tenantId, isActive: true },
          select: {
            id: true,
            planAssociations: {
              where: { isActive: true },
              select: { planId: true },
            },
          },
        })
      : null,
    params.priceId
      ? prisma.price.findFirst({
          where: { id: params.priceId, tenantId, isActive: true },
          select: {
            id: true,
            addonId: true,
            currency: true,
            priceType: true,
            addon: {
              select: {
                planAssociations: {
                  where: { isActive: true },
                  select: { planId: true },
                },
              },
            },
          },
        })
      : null,
  ])
  if (params.addonId && !addon)
    return err('The selected add-on was not found.', 404)
  if (params.priceId && !price)
    return err('The selected price was not found.', 404)
  if (price && price.priceType !== 'ONE_TIME')
    return err('Subscription charges require a one-time price.', 422)
  if (price?.currency && price.currency !== params.currency)
    return err('The selected price uses a different currency.', 422)
  if (params.addonId && price && price.addonId !== params.addonId)
    return err('The selected price does not belong to this add-on.', 422)
  const planId = subscription.items.find((item) => item.price.planId)?.price
    .planId
  const resolvedAddon = price?.addon ?? addon
  if (
    resolvedAddon &&
    (!planId ||
      !resolvedAddon.planAssociations.some(
        (association) => association.planId === planId
      ))
  )
    return err('The selected add-on is not available for this plan.', 422)

  const now = nowUnixSeconds()
  const chargeId = generateId('SubscriptionCharge')
  try {
    const invoiceId = await prisma.$transaction(
      async (tx) => {
        await tx.subscriptionCharge.create({
          data: {
            id: chargeId,
            tenantId,
            subscriptionId,
            customerId: subscription.customerId,
            addonId: params.addonId ?? price?.addonId ?? null,
            priceId: params.priceId ?? null,
            invoiceBehavior: params.invoiceBehavior,
            description: params.description,
            quantity: params.quantity,
            unitAmount: params.unitAmount,
            currency: params.currency,
            taxBehavior: params.taxBehavior,
            isTaxable: params.isTaxable,
            serviceAt: params.serviceAt ?? null,
            createdByUserId: actorUserId ?? null,
            createdAt: now,
            updatedAt: now,
          },
        })
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'CHARGE_ADDED',
            actorUserId: actorUserId ?? null,
            details: {
              chargeId,
              invoiceBehavior: params.invoiceBehavior,
              amount: (params.unitAmount * BigInt(params.quantity)).toString(),
              currency: params.currency,
            },
            occurredAt: now,
          },
        })

        if (params.invoiceBehavior === 'NEXT_INVOICE') return null

        return invoiceUnbilledCharges(tx, tenantId, subscriptionId, now, [
          chargeId,
        ])
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: chargeId, invoiceId })
  } catch (error) {
    console.error('[billing.service.subscriptions.charges.create]', error)
    return err('Failed to add the subscription charge.', 500)
  }
}

export function listCharges(tenantId: string, subscriptionId: string) {
  return prisma.subscriptionCharge.findMany({
    where: { tenantId, subscriptionId },
    include: { addon: true, price: true, invoice: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function voidCharge(
  tenantId: string,
  subscriptionId: string,
  chargeId: string,
  actorUserId?: string
): ServiceResult<{ id: string }> {
  const charge = await prisma.subscriptionCharge.findFirst({
    where: { id: chargeId, tenantId, subscriptionId },
    select: { id: true, status: true },
  })
  if (!charge) return err('The subscription charge was not found.', 404)
  if (charge.status !== 'UNBILLED')
    return err('Only an unbilled charge can be voided.', 409)

  const now = nowUnixSeconds()
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionCharge.update({
      where: { id: chargeId },
      data: { status: 'VOID', voidedAt: now, updatedAt: now },
    })
    await tx.subscriptionEvent.create({
      data: {
        id: generateId('SubscriptionEvent'),
        subscriptionId,
        type: 'UPDATED',
        actorUserId: actorUserId ?? null,
        details: { chargeId, chargeVoided: true },
        occurredAt: now,
      },
    })
  })

  return ok({ id: chargeId })
}

/** Creates one invoice for a stable set of unbilled charges. */
export async function invoiceUnbilledCharges(
  tx: PrismaTransaction,
  tenantId: string,
  subscriptionId: string,
  asOf: number,
  chargeIds?: string[]
): Promise<string | null> {
  const subscription = await tx.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: {
      customer: true,
      paymentTerm: true,
      charges: {
        where: {
          status: 'UNBILLED',
          ...(chargeIds ? { id: { in: chargeIds } } : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (!subscription || subscription.charges.length === 0) return null

  const [firstCharge] = subscription.charges
  if (!firstCharge) return null
  if (
    subscription.charges.some(
      (charge) =>
        charge.currency !== firstCharge.currency ||
        charge.taxBehavior !== firstCharge.taxBehavior
    )
  )
    throw new Error(
      'Charges with different currencies or tax modes cannot be invoiced together.'
    )

  const preference = await tx.subscriptionPreference.findUnique({
    where: { tenantId },
  })
  const invoiceMode =
    subscription.invoiceModeOverride ??
    preference?.defaultInvoiceMode ??
    'AUTO_FINALIZE'
  const taxRate = await tx.taxRate.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
    orderBy: { startsAt: 'desc' },
  })
  const chargeLines = calculateInvoiceChargeLines(
    subscription.charges.map((charge) => ({
      subtotalAmount: charge.unitAmount * BigInt(charge.quantity),
      taxable: charge.isTaxable,
    })),
    0n,
    taxRate
      ? { ...taxRate, inclusive: firstCharge.taxBehavior === 'INCLUSIVE' }
      : null
  )
  const subtotalAmount = chargeLines.reduce(
    (sum, line) => sum + line.subtotalAmount,
    0n
  )
  const taxAmount = chargeLines.reduce((sum, line) => sum + line.taxAmount, 0n)
  const totalAmount = chargeLines.reduce(
    (sum, line) => sum + line.totalAmount,
    0n
  )
  const paymentTerm =
    subscription.paymentTerm ??
    (subscription.customer.paymentTermId
      ? await tx.paymentTerm.findFirst({
          where: {
            id: subscription.customer.paymentTermId,
            tenantId,
            isActive: true,
          },
        })
      : await tx.paymentTerm.findFirst({
          where: { tenantId, isDefault: true, isActive: true },
        }))
  const number = await nextDocumentNumber(tenantId, 'INVOICE', asOf, tx)
  const invoiceId = generateId('Invoice')
  const dueAt = paymentTerm ? resolveDueAt(asOf, paymentTerm) : asOf
  const status =
    totalAmount === 0n ? 'PAID' : invoiceMode === 'DRAFT' ? 'DRAFT' : 'OPEN'

  const invoice = await tx.invoice.create({
    data: {
      id: invoiceId,
      tenantId,
      customerId: subscription.customerId,
      subscriptionId,
      paymentTermId: paymentTerm?.id ?? null,
      paymentTermName: paymentTerm?.name ?? null,
      salespersonId: subscription.customer.salespersonId,
      number,
      status,
      billingReason: 'SUBSCRIPTION_UPDATE',
      currency: firstCharge.currency,
      taxBehavior: firstCharge.taxBehavior,
      issueAt: asOf,
      dueAt,
      finalizedAt: invoiceMode === 'DRAFT' ? null : asOf,
      paidAt: totalAmount === 0n ? asOf : null,
      subtotalAmount,
      taxAmount,
      totalAmount,
      amountDue: totalAmount,
      createdAt: asOf,
      updatedAt: asOf,
      lines: {
        create: subscription.charges.map((charge, index) => {
          const line = chargeLines[index]!

          return {
            id: generateId('InvoiceLine'),
            priceId: charge.priceId,
            subscriptionChargeId: charge.id,
            description: charge.description,
            position: index,
            quantity: charge.quantity,
            unitAmount: charge.unitAmount,
            taxAmount: line.taxAmount,
            taxRateId: taxRate?.id ?? null,
            taxName: taxRate?.name ?? null,
            taxRate: taxRate?.rate ?? null,
            taxInclusive: firstCharge.taxBehavior === 'INCLUSIVE',
            totalAmount: line.totalAmount,
            servicePeriodStart: charge.serviceAt,
            servicePeriodEnd: charge.serviceAt,
            createdAt: asOf,
            updatedAt: asOf,
          }
        }),
      },
    },
  })
  await tx.invoiceSubscription.create({
    data: {
      tenantId,
      invoiceId,
      subscriptionId,
      subtotalAmount,
      taxAmount,
      totalAmount,
      createdAt: asOf,
    },
  })
  await tx.subscriptionCharge.updateMany({
    where: {
      id: { in: subscription.charges.map((charge) => charge.id) },
      status: 'UNBILLED',
    },
    data: { status: 'INVOICED', invoiceId, invoicedAt: asOf, updatedAt: asOf },
  })

  if (invoiceMode !== 'DRAFT') {
    await recordLedgerEntry(tx, {
      tenantId,
      customerId: subscription.customerId,
      subscriptionId,
      invoiceId,
      type: 'INVOICE_FINALIZED',
      direction: 'DEBIT',
      amount: totalAmount,
      currency: firstCharge.currency,
      description: `Subscription charge invoice ${number} finalized`,
      idempotencyKey: `invoice:${invoiceId}:finalized`,
      effectiveAt: asOf,
      createdAt: asOf,
    })
    if (subscription.autoApplyCredits && totalAmount > 0n)
      await settleWithAvailableCredits(
        tx,
        {
          id: invoice.id,
          tenantId,
          customerId: subscription.customerId,
          subscriptionId,
          number,
          currency: firstCharge.currency,
          status: 'OPEN',
          amountDue: totalAmount,
          paidAt: null,
        },
        asOf
      )
    await recomputeCustomerAr(tx, tenantId, subscription.customerId, asOf)
  }

  await tx.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'INVOICE_GENERATED',
      details: {
        invoiceId,
        chargeIds: subscription.charges.map((charge) => charge.id),
        totalAmount: totalAmount.toString(),
      },
      occurredAt: asOf,
    },
  })

  return invoiceId
}
