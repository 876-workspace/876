import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'

import {
  calculateDiscount,
  calculateInvoiceChargeLines,
} from '../billing-engine'
import { recomputeCustomerAr } from '../customers/ar'
import { nextDocumentNumber } from '../documents/numbers'
import { recordLedgerEntry } from '../ledger'
import { resolveDueAt } from '../payment-terms'
import { calculateCatalogAmount } from '../pricing'
import { isUniqueConstraintError } from '../shared'
import { settleWithAvailableCredits } from '../invoices/settlement'
import { addInterval } from './period'
import { adjustRenewalAmount } from './renewal-pricing'
import { enqueueSubscriptionNotification } from './notifications'
import { prorateInitialStubAmount } from './amounts'

interface BillResult {
  status: 'succeeded' | 'skipped'
  invoiceId: string | null
}

interface BillOptions {
  advance?: boolean
  consolidateWithInvoiceId?: string
  forceAdvance?: boolean
  invoiceModeOverride?: 'AUTO_FINALIZE' | 'DRAFT'
}

/** Generates one idempotent invoice for a due subscription service period. */
export async function billSubscription(
  tenantId: string,
  subscriptionId: string,
  asOf = nowUnixSeconds(),
  options: BillOptions = {}
): Promise<BillResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const subscription = await tx.subscription.findFirst({
          where: { id: subscriptionId, tenantId },
          include: {
            customer: true,
            paymentTerm: true,
            items: {
              where: { isActive: true },
              include: {
                price: {
                  include: {
                    tiers: true,
                    item: true,
                    plan: { include: { product: true } },
                    addon: { include: { product: true } },
                  },
                },
              },
            },
            discounts: {
              where: {
                status: 'ACTIVE',
                startsAt: { lte: asOf },
                OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
              },
              orderBy: { createdAt: 'asc' },
            },
            charges: {
              where: { status: 'UNBILLED', invoiceBehavior: 'NEXT_INVOICE' },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
            amendments: {
              where: { status: 'PENDING' },
              select: { id: true },
              take: 1,
            },
          },
        })
        if (!subscription) throw new Error('Subscription not found.')
        const advance = options.advance === true
        if (advance && subscription.status !== 'ACTIVE')
          return { status: 'skipped', invoiceId: null }
        if (advance && subscription.amendments.length > 0)
          return { status: 'skipped', invoiceId: null }
        if (
          (subscription.status !== 'ACTIVE' &&
            subscription.status !== 'TRIALING') ||
          subscription.nextBillingAt === null ||
          (advance
            ? subscription.nextBillingAt <= asOf ||
              (!options.forceAdvance &&
                (subscription.nextAdvanceInvoiceAt === null ||
                  subscription.nextAdvanceInvoiceAt > asOf))
            : subscription.nextBillingAt > asOf) ||
          subscription.currentPeriodStart === null ||
          subscription.currentPeriodEnd === null
        )
          return { status: 'skipped', invoiceId: null }

        const preference = await tx.subscriptionPreference.findUnique({
          where: { tenantId },
        })
        const invoiceMode =
          options.invoiceModeOverride ??
          subscription.invoiceModeOverride ??
          preference?.defaultInvoiceMode ??
          'AUTO_FINALIZE'

        const existingRun = await tx.subscriptionBillingRun.findUnique({
          where: {
            billing_runs_subscription_period_key: {
              subscriptionId,
              periodStart: subscription.currentPeriodStart,
              periodEnd: subscription.currentPeriodEnd,
            },
          },
        })
        if (existingRun?.status === 'PROCESSING')
          return { status: 'skipped', invoiceId: existingRun.invoiceId }

        const fixedItems = subscription.items.filter(
          (item) =>
            item.currency !== null &&
            item.price.intervalUnit !== null &&
            item.price.intervalCount !== null
        )
        if (fixedItems.length !== subscription.items.length)
          throw new Error('Subscription contains incomplete recurring prices.')
        const [firstItem] = fixedItems
        if (!firstItem?.currency)
          throw new Error('Subscription does not have a billing currency.')

        if (existingRun?.status === 'SUCCEEDED') {
          if (advance || existingRun.periodAdvancedAt !== null)
            return { status: 'skipped', invoiceId: existingRun.invoiceId }
          await advanceSubscriptionPeriod(tx, subscription, firstItem, asOf)
          await tx.subscriptionBillingRun.update({
            where: { id: existingRun.id },
            data: { periodAdvancedAt: asOf, updatedAt: asOf },
          })

          return { status: 'succeeded', invoiceId: existingRun.invoiceId }
        }

        const currency = firstItem.currency
        if (
          subscription.charges.some(
            (charge) =>
              charge.currency !== currency ||
              charge.taxBehavior !== subscription.taxBehavior
          )
        )
          throw new Error(
            'Unbilled charges must match the subscription currency and tax behavior.'
          )
        const resolvedItems = fixedItems.map((item) => {
          const baseUnitAmount =
            subscription.renewalPricingPolicy === 'RETAIN_EXISTING'
              ? (item.unitAmount ?? item.price.unitAmount)
              : item.price.unitAmount
          const unitAmount = adjustRenewalAmount(
            baseUnitAmount,
            subscription.renewalPricingPolicy,
            subscription.renewalAdjustmentPercent?.toString() ?? null
          )
          return {
            item,
            unitAmount,
            subtotalAmount: prorateInitialStubAmount(
              calculateCatalogAmount(
                { ...item.price, unitAmount },
                item.quantity
              ),
              subscription,
              item.price
            ),
          }
        })
        const chargeSubtotals = subscription.charges.map(
          (charge) => charge.unitAmount * BigInt(charge.quantity)
        )
        const lineSubtotals = [
          ...resolvedItems.map((item) => item.subtotalAmount),
          ...chargeSubtotals,
        ]
        const subtotalAmount = lineSubtotals.reduce(
          (total, amount) => total + amount,
          0n
        )
        const itemDiscounts = lineSubtotals.map(() => 0n)
        let transactionDiscountAmount = 0n
        for (const discount of subscription.discounts) {
          if (discount.scope === 'ITEM' && discount.subscriptionItemId) {
            const itemIndex = resolvedItems.findIndex(
              ({ item }) => item.id === discount.subscriptionItemId
            )
            if (itemIndex < 0) continue
            const remaining =
              lineSubtotals[itemIndex]! - itemDiscounts[itemIndex]!
            itemDiscounts[itemIndex] += calculateDiscount(
              remaining,
              currency,
              discount
            )
            continue
          }
          const remaining =
            subtotalAmount -
            itemDiscounts.reduce((sum, amount) => sum + amount, 0n) -
            transactionDiscountAmount
          if (remaining === 0n) break
          transactionDiscountAmount += calculateDiscount(
            remaining,
            currency,
            discount
          )
        }
        const discountAmount =
          itemDiscounts.reduce((sum, amount) => sum + amount, 0n) +
          transactionDiscountAmount
        const defaultTaxRate = await tx.taxRate.findFirst({
          where: {
            tenantId,
            isDefault: true,
            isActive: true,
            OR: [
              { startsAt: null },
              { startsAt: { lte: subscription.currentPeriodStart } },
            ],
          },
          orderBy: { startsAt: 'desc' },
        })
        const calculatedLines = calculateInvoiceChargeLines(
          [
            ...resolvedItems.map(({ item }, index) => ({
              subtotalAmount: lineSubtotals[index]! - itemDiscounts[index]!,
              taxable:
                item.price.isTaxable ||
                Boolean(item.price.plan?.isTaxable) ||
                Boolean(item.price.item?.isTaxable) ||
                Boolean(item.price.addon?.isTaxable),
            })),
            ...subscription.charges.map((charge, index) => ({
              subtotalAmount:
                (chargeSubtotals[index] ?? 0n) -
                itemDiscounts[resolvedItems.length + index]!,
              taxable: charge.isTaxable,
            })),
          ],
          transactionDiscountAmount,
          defaultTaxRate
            ? {
                ...defaultTaxRate,
                inclusive: subscription.taxBehavior === 'INCLUSIVE',
              }
            : null
        )
        const recurringLines = resolvedItems.map((resolved, index) => {
          const calculated = calculatedLines[index] ?? {
            subtotalAmount: 0n,
            discountAmount: 0n,
            taxAmount: 0n,
            totalAmount: 0n,
          }

          return {
            ...resolved,
            ...calculated,
            subtotalAmount: resolved.subtotalAmount,
            discountAmount: calculated.discountAmount + itemDiscounts[index]!,
          }
        })
        const oneTimeLines = subscription.charges.map((charge, index) => {
          const lineIndex = resolvedItems.length + index
          const calculated = calculatedLines[lineIndex] ?? {
            subtotalAmount: 0n,
            discountAmount: 0n,
            taxAmount: 0n,
            totalAmount: 0n,
          }

          return {
            charge,
            ...calculated,
            subtotalAmount: chargeSubtotals[index] ?? 0n,
            discountAmount:
              calculated.discountAmount + itemDiscounts[lineIndex]!,
          }
        })
        const taxAmount = [...recurringLines, ...oneTimeLines].reduce(
          (total, line) => total + line.taxAmount,
          0n
        )
        const totalAmount = [...recurringLines, ...oneTimeLines].reduce(
          (total, line) => total + line.totalAmount,
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

        const runId = existingRun?.id ?? generateId('SubscriptionBillingRun')
        if (existingRun)
          await tx.subscriptionBillingRun.update({
            where: { id: existingRun.id },
            data: {
              status: 'PROCESSING',
              attemptCount: { increment: 1 },
              errorCode: null,
              errorMessage: null,
              startedAt: asOf,
              completedAt: null,
              updatedAt: asOf,
            },
          })
        else
          await tx.subscriptionBillingRun.create({
            data: {
              id: runId,
              tenantId,
              subscriptionId,
              periodStart: subscription.currentPeriodStart,
              periodEnd: subscription.currentPeriodEnd,
              scheduledFor: advance
                ? (subscription.nextAdvanceInvoiceAt ?? asOf)
                : subscription.nextBillingAt,
              isAdvanceBilling: advance,
              status: 'PROCESSING',
              startedAt: asOf,
              createdAt: asOf,
              updatedAt: asOf,
            },
          })

        const issueAt = advance ? asOf : subscription.nextBillingAt
        const paymentTermStart =
          advance && preference?.advanceTermsFromPeriodStart
            ? subscription.currentPeriodStart
            : issueAt
        const dueAt = paymentTerm
          ? resolveDueAt(paymentTermStart, paymentTerm)
          : paymentTermStart
        const consolidatedInvoice = options.consolidateWithInvoiceId
          ? await tx.invoice.findFirst({
              where: {
                id: options.consolidateWithInvoiceId,
                tenantId,
                customerId: subscription.customerId,
                currency,
                taxBehavior: subscription.taxBehavior,
                status: { in: ['DRAFT', 'OPEN', 'SENT', 'PARTIALLY_PAID'] },
              },
              include: { _count: { select: { lines: true } } },
            })
          : null
        if (
          options.consolidateWithInvoiceId &&
          (!consolidatedInvoice ||
            (consolidatedInvoice.status === 'DRAFT') !==
              (invoiceMode === 'DRAFT'))
        )
          throw new Error(
            'The consolidation invoice is not compatible with this subscription.'
          )

        const invoiceId = consolidatedInvoice?.id ?? generateId('Invoice')
        const number =
          consolidatedInvoice?.number ??
          (await nextDocumentNumber(tenantId, 'INVOICE', asOf, tx))
        const positionOffset = consolidatedInvoice?._count.lines ?? 0
        const invoiceLines = [
          ...recurringLines.map((line, position) => ({
            id: generateId('InvoiceLine'),
            itemId: line.item.price.itemId,
            priceId: line.item.priceId,
            subscriptionItemId: line.item.id,
            description:
              line.item.description ??
              line.item.price.plan?.name ??
              line.item.price.addon?.name ??
              line.item.price.item?.name ??
              line.item.price.nickname ??
              'Subscription charge',
            position: positionOffset + position,
            quantity: line.item.quantity,
            unitAmount: line.unitAmount ?? 0n,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            totalAmount: line.totalAmount,
            servicePeriodStart: subscription.currentPeriodStart,
            servicePeriodEnd: subscription.currentPeriodEnd,
            createdAt: asOf,
            updatedAt: asOf,
          })),
          ...oneTimeLines.map((line, index) => ({
            id: generateId('InvoiceLine'),
            priceId: line.charge.priceId,
            subscriptionChargeId: line.charge.id,
            description: line.charge.description,
            position: positionOffset + recurringLines.length + index,
            quantity: line.charge.quantity,
            unitAmount: line.charge.unitAmount,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            totalAmount: line.totalAmount,
            servicePeriodStart: line.charge.serviceAt,
            servicePeriodEnd: line.charge.serviceAt,
            createdAt: asOf,
            updatedAt: asOf,
          })),
        ]
        const invoice = consolidatedInvoice
          ? await tx.invoice.update({
              where: { id: consolidatedInvoice.id },
              data: {
                servicePeriodStart: Math.min(
                  consolidatedInvoice.servicePeriodStart ??
                    subscription.currentPeriodStart,
                  subscription.currentPeriodStart
                ),
                servicePeriodEnd: Math.max(
                  consolidatedInvoice.servicePeriodEnd ??
                    subscription.currentPeriodEnd,
                  subscription.currentPeriodEnd
                ),
                subtotalAmount: { increment: subtotalAmount },
                discountAmount: { increment: discountAmount },
                taxAmount: { increment: taxAmount },
                totalAmount: { increment: totalAmount },
                amountDue: { increment: totalAmount },
                status:
                  consolidatedInvoice.status === 'DRAFT' ? 'DRAFT' : 'OPEN',
                paidAt: null,
                updatedAt: asOf,
                lines: { create: invoiceLines },
              },
            })
          : await tx.invoice.create({
              data: {
                id: invoiceId,
                tenantId,
                customerId: subscription.customerId,
                subscriptionId,
                paymentTermId: paymentTerm?.id ?? null,
                salespersonId: subscription.customer.salespersonId,
                salespersonName: null,
                paymentTermName: paymentTerm?.name ?? null,
                number,
                status:
                  totalAmount === 0n
                    ? 'PAID'
                    : invoiceMode === 'DRAFT'
                      ? 'DRAFT'
                      : 'OPEN',
                billingReason:
                  subscription.billedCycleCount === 0
                    ? 'SUBSCRIPTION_CREATE'
                    : 'SUBSCRIPTION_CYCLE',
                currency,
                taxBehavior: subscription.taxBehavior,
                issueAt,
                dueAt,
                finalizedAt: invoiceMode === 'DRAFT' ? null : asOf,
                paidAt: totalAmount === 0n ? asOf : null,
                servicePeriodStart: subscription.currentPeriodStart,
                servicePeriodEnd: subscription.currentPeriodEnd,
                subtotalAmount,
                discountAmount,
                taxAmount,
                totalAmount,
                amountDue: totalAmount,
                amountPaid: 0n,
                amountCredited: 0n,
                amountWrittenOff: 0n,
                createdAt: asOf,
                updatedAt: asOf,
                lines: {
                  create: invoiceLines,
                },
              },
            })

        if (subscription.charges.length)
          await tx.subscriptionCharge.updateMany({
            where: {
              id: { in: subscription.charges.map((charge) => charge.id) },
              status: 'UNBILLED',
            },
            data: {
              status: 'INVOICED',
              invoiceId,
              invoicedAt: asOf,
              updatedAt: asOf,
            },
          })

        await tx.invoiceSubscription.create({
          data: {
            tenantId,
            invoiceId,
            subscriptionId,
            servicePeriodStart: subscription.currentPeriodStart,
            servicePeriodEnd: subscription.currentPeriodEnd,
            subtotalAmount,
            discountAmount,
            taxAmount,
            totalAmount,
            createdAt: asOf,
          },
        })
        if (invoiceMode === 'DRAFT' && preference?.notifyDraftInvoice)
          await enqueueSubscriptionNotification(tx, {
            tenantId,
            subscriptionId,
            invoiceId,
            type: 'DRAFT_INVOICE_READY',
            dedupeKey: `draft-invoice:${invoiceId}`,
            payload: {
              invoiceId,
              subscriptionId,
              customerId: subscription.customerId,
            },
            createdAt: asOf,
          })

        if (invoiceMode !== 'DRAFT')
          await recordLedgerEntry(tx, {
            tenantId,
            customerId: subscription.customerId,
            subscriptionId,
            invoiceId,
            type: 'INVOICE_FINALIZED',
            direction: 'DEBIT',
            amount: totalAmount,
            currency,
            description: `Subscription invoice ${number} finalized`,
            idempotencyKey: `invoice:${invoiceId}:finalized`,
            effectiveAt: issueAt,
            createdAt: asOf,
          })

        if (
          invoiceMode !== 'DRAFT' &&
          subscription.autoApplyCredits &&
          totalAmount > 0n
        )
          await settleWithAvailableCredits(
            tx,
            {
              id: invoice.id,
              tenantId,
              customerId: subscription.customerId,
              subscriptionId,
              number,
              currency,
              status: 'OPEN',
              amountDue: invoice.amountDue,
              paidAt: null,
            },
            asOf
          )

        for (const discount of subscription.discounts) {
          if (discount.duration === 'ONCE')
            await tx.subscriptionDiscount.update({
              where: { id: discount.id },
              data: {
                status: 'EXHAUSTED',
                remainingCycles: 0,
                updatedAt: asOf,
              },
            })
          if (
            discount.duration === 'REPEATING' &&
            discount.remainingCycles !== null
          ) {
            const remainingCycles = Math.max(discount.remainingCycles - 1, 0)
            await tx.subscriptionDiscount.update({
              where: { id: discount.id },
              data: {
                remainingCycles,
                status: remainingCycles === 0 ? 'EXHAUSTED' : 'ACTIVE',
                updatedAt: asOf,
              },
            })
          }
        }

        if (advance)
          await tx.subscription.update({
            where: { id: subscriptionId },
            data: {
              nextAdvanceInvoiceAt: null,
              lastBilledAt: asOf,
              updatedAt: asOf,
            },
          })
        else await advanceSubscriptionPeriod(tx, subscription, firstItem, asOf)
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'INVOICE_GENERATED',
            details: {
              invoiceId,
              billingRunId: runId,
              periodStart: subscription.currentPeriodStart,
              periodEnd: subscription.currentPeriodEnd,
              subtotalAmount: subtotalAmount.toString(),
              discountAmount: discountAmount.toString(),
              taxAmount: taxAmount.toString(),
              totalAmount: totalAmount.toString(),
            },
            occurredAt: asOf,
          },
        })
        await tx.subscriptionBillingRun.update({
          where: { id: runId },
          data: {
            status: 'SUCCEEDED',
            invoiceId,
            periodAdvancedAt: advance ? null : asOf,
            completedAt: asOf,
            updatedAt: asOf,
          },
        })
        await recomputeCustomerAr(tx, tenantId, subscription.customerId, asOf)

        return { status: 'succeeded', invoiceId }
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    try {
      await recordBillingFailure(tenantId, subscriptionId, asOf, error)
    } catch (failureRecordError) {
      console.error('[billing.service.subscriptions.failure-record]', {
        subscriptionId,
        error: failureRecordError,
      })
    }
    throw error
  }
}

async function recordBillingFailure(
  tenantId: string,
  subscriptionId: string,
  asOf: number,
  error: unknown
): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      nextBillingAt: true,
    },
  })
  if (
    !subscription ||
    subscription.currentPeriodStart === null ||
    subscription.currentPeriodEnd === null ||
    subscription.nextBillingAt === null
  )
    return

  const errorCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : null
  const errorMessage =
    error instanceof Error ? error.message.slice(0, 1_000) : 'Billing failed.'
  const period = {
    subscriptionId,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  }
  const updated = await prisma.subscriptionBillingRun.updateMany({
    where: {
      ...period,
      status: { not: 'SUCCEEDED' },
    },
    data: {
      status: 'FAILED',
      attemptCount: { increment: 1 },
      errorCode,
      errorMessage,
      completedAt: asOf,
      updatedAt: asOf,
    },
  })
  if (updated.count > 0) return

  try {
    await prisma.subscriptionBillingRun.create({
      data: {
        id: generateId('SubscriptionBillingRun'),
        tenantId,
        ...period,
        scheduledFor: subscription.nextBillingAt,
        status: 'FAILED',
        errorCode,
        errorMessage,
        startedAt: asOf,
        completedAt: asOf,
        createdAt: asOf,
        updatedAt: asOf,
      },
    })
  } catch (error) {
    // Another worker may have completed this period between the update and
    // create. Its successful run is authoritative and must not be overwritten.
    if (!isUniqueConstraintError(error)) throw error
  }
}

async function advanceSubscriptionPeriod(
  tx: PrismaTransaction,
  subscription: {
    id: string
    billingCycleAnchor: number | null
    billingTiming: 'IN_ADVANCE' | 'IN_ARREARS'
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    servicePeriodStart: number | null
    servicePeriodEnd: number | null
    billedCycleCount: number
    completedRegularCycles: number
    hasInitialStubPeriod: boolean
    remainingCycles: number | null
    advanceBillingEnabled: boolean | null
    advanceBillingDays: number | null
  },
  firstItem: {
    price: {
      intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
      intervalCount: number | null
      plan: { billingCycleCount: number | null } | null
    }
  },
  asOf: number
) {
  if (
    subscription.currentPeriodStart === null ||
    subscription.currentPeriodEnd === null ||
    !firstItem.price.intervalUnit ||
    !firstItem.price.intervalCount
  )
    throw new Error('Subscription cadence is unavailable.')

  const billedCycleCount = subscription.billedCycleCount + 1
  const completedRegularCycles =
    subscription.completedRegularCycles +
    (subscription.hasInitialStubPeriod ? 0 : 1)
  const cycleLimit = firstItem.price.plan?.billingCycleCount ?? null
  const remainingCycles =
    subscription.remainingCycles === null
      ? cycleLimit === null
        ? null
        : Math.max(cycleLimit - completedRegularCycles, 0)
      : subscription.hasInitialStubPeriod
        ? subscription.remainingCycles
        : Math.max(subscription.remainingCycles - 1, 0)
  const ended = remainingCycles === 0
  const nextPeriodStart = subscription.currentPeriodEnd
  const nextPeriodEnd = addInterval(
    subscription.billingCycleAnchor ?? subscription.currentPeriodStart,
    firstItem.price.intervalUnit,
    firstItem.price.intervalCount * (completedRegularCycles + 1)
  )
  const nextBillingAt = ended
    ? null
    : subscription.billingTiming === 'IN_ADVANCE'
      ? nextPeriodStart
      : nextPeriodEnd
  const nextAdvanceInvoiceAt =
    !ended &&
    subscription.advanceBillingEnabled &&
    subscription.advanceBillingDays &&
    nextBillingAt
      ? Math.max(asOf, nextBillingAt - subscription.advanceBillingDays * 86_400)
      : null

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: ended ? 'ENDED' : 'ACTIVE',
      currentPeriodStart: ended
        ? subscription.currentPeriodStart
        : nextPeriodStart,
      currentPeriodEnd: ended ? subscription.currentPeriodEnd : nextPeriodEnd,
      servicePeriodStart:
        subscription.billingTiming === 'IN_ADVANCE' || ended
          ? subscription.currentPeriodStart
          : nextPeriodStart,
      servicePeriodEnd:
        subscription.billingTiming === 'IN_ADVANCE' || ended
          ? subscription.currentPeriodEnd
          : nextPeriodEnd,
      nextBillingAt,
      nextAdvanceInvoiceAt,
      lastBilledAt: asOf,
      billedCycleCount,
      completedRegularCycles,
      hasInitialStubPeriod: false,
      remainingCycles,
      endedAt: ended ? asOf : null,
      updatedAt: asOf,
    },
  })
}
