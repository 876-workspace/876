import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  CustomerEnsureBody,
  CustomerListQuery,
  CustomerUpdateBody,
  OpeningBalanceBody,
} from './customers.schemas'

const customerInclude = {
  contacts: { where: { isPrimary: true }, take: 1 },
} as const

export function listCustomerRows(
  tenantId: string,
  query: CustomerListQuery,
  sourceAppId?: string
) {
  return prisma.customer.findMany({
    where: {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.ids ? { id: { in: query.ids } } : {}),
      ...(sourceAppId ? { sourceAppId } : {}),
      ...(query.starting_after ? { id: { gt: query.starting_after } } : {}),
      ...(query.ending_before ? { id: { lt: query.ending_before } } : {}),
    },
    include: customerInclude,
    orderBy: { id: query.ending_before ? 'desc' : 'asc' },
    take: query.limit + 1,
  })
}

export function findCustomerRow(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  return prisma.customer.findFirst({
    where: { tenantId, id, ...(sourceAppId ? { sourceAppId } : {}) },
    include: customerInclude,
  })
}

export function findIdempotentCustomerRow(
  tenantId: string,
  sourceAppId: string,
  sourceIdempotencyKey: string
) {
  return prisma.customer.findUnique({
    where: {
      billing_customers_source_idempotency_key: {
        tenantId,
        sourceAppId,
        sourceIdempotencyKey,
      },
    },
    include: customerInclude,
  })
}

export function createCustomerRow(data: Prisma.CustomerUncheckedCreateInput) {
  return prisma.customer.create({ data, include: customerInclude })
}

export async function updateCustomerRow(
  tenantId: string,
  id: string,
  data: CustomerUpdateBody & { updatedAt: number },
  sourceAppId?: string
) {
  const { currency, ...rest } = data
  const result = await prisma.customer.updateMany({
    where: { tenantId, id, ...(sourceAppId ? { sourceAppId } : {}) },
    data: {
      ...rest,
      ...(currency === undefined ? {} : { defaultCurrency: currency }),
    },
  })
  return result.count ? findCustomerRow(tenantId, id, sourceAppId) : null
}

export async function deleteCustomerRow(
  tenantId: string,
  id: string,
  sourceAppId?: string
) {
  const activity = await prisma.customer.findFirst({
    where: { tenantId, id, ...(sourceAppId ? { sourceAppId } : {}) },
    select: {
      _count: {
        select: { invoices: true, payments: true, subscriptions: true },
      },
    },
  })
  if (!activity) return null
  if (
    activity._count.invoices ||
    activity._count.payments ||
    activity._count.subscriptions
  ) {
    await prisma.customer.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })
  } else {
    await prisma.customer.delete({ where: { id } })
  }
  return true
}

export function listCustomerLedgerRows(tenantId: string, customerId: string) {
  return prisma.customerLedgerEntry.findMany({
    where: { tenantId, customerId },
    orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
}

export function listDocumentRecipientRows(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      customerKind: true,
      companyName: true,
      salutation: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      workPhone: true,
      priceListId: true,
      contacts: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 1,
        select: {
          salutation: true,
          firstName: true,
          lastName: true,
          email: true,
          workPhone: true,
          mobilePhone: true,
        },
      },
      addresses: {
        where: { type: 'billing' },
        orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 1,
        select: {
          label: true,
          attention: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          countryCode: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })
}

export async function updateCustomerLinkRow(
  tenantId: string,
  id: string,
  data: {
    customerType: 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'
    organizationId: string | null
    userId: string | null
    updatedAt: number
  }
) {
  const result = await prisma.customer.updateMany({
    where: { tenantId, id },
    data,
  })
  return result.count ? findCustomerRow(tenantId, id) : null
}

export function recordOpeningBalanceRows(
  tenantId: string,
  customerId: string,
  body: OpeningBalanceBody,
  ids: { invoiceId: string; lineId: string; ledgerId: string },
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const enabled = await tx.tenantCurrency.findFirst({
      where: { tenantId, currencyCode: body.currency, isEnabled: true },
      select: { currencyCode: true },
    })
    if (!enabled) return { kind: 'currency' as const }
    const customer = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM billing_customers
      WHERE tenant_id = ${tenantId} AND id = ${customerId}
      FOR UPDATE
    `
    if (!customer[0]) return { kind: 'customer' as const }
    const description = body.reference
      ? `Opening balance: ${body.reference}`
      : 'Opening balance'
    await tx.invoice.create({
      data: {
        id: ids.invoiceId,
        tenantId,
        customerId,
        number: `INV-${now}-${ids.invoiceId.slice(-6)}`,
        status: 'OPEN',
        billingReason: 'OPENING_BALANCE',
        currency: body.currency,
        issueAt: body.asOf,
        dueAt: body.asOf,
        finalizedAt: now,
        subtotalAmount: body.amount,
        totalAmount: body.amount,
        amountDue: body.amount,
        notes: description,
        createdAt: now,
        updatedAt: now,
      },
    })
    await tx.invoiceLine.create({
      data: {
        id: ids.lineId,
        invoiceId: ids.invoiceId,
        description: 'Opening balance',
        position: 0,
        quantity: 1,
        unitAmount: body.amount,
        totalAmount: body.amount,
        createdAt: now,
        updatedAt: now,
      },
    })
    await tx.customerLedgerEntry.create({
      data: {
        id: ids.ledgerId,
        tenantId,
        customerId,
        invoiceId: ids.invoiceId,
        type: 'OPENING_BALANCE',
        direction: 'DEBIT',
        amount: body.amount,
        currency: body.currency,
        description,
        idempotencyKey: `invoice:${ids.invoiceId}:finalized`,
        effectiveAt: body.asOf,
        createdAt: now,
      },
    })
    await tx.customer.update({
      where: { id: customerId },
      data: {
        outstandingReceivable: { increment: body.amount },
        updatedAt: now,
      },
    })
    return { kind: 'created' as const, invoiceId: ids.invoiceId }
  })
}

export function resolveEnsureTenant(
  body: CustomerEnsureBody,
  platformSlug: string
) {
  return prisma.tenant.findFirst({
    where: body.tenantId
      ? { id: body.tenantId }
      : { slug: body.tenantSlug ?? platformSlug },
  })
}

export function findCoreCustomer(tenantId: string, body: CustomerEnsureBody) {
  return prisma.customer.findFirst({
    where: {
      tenantId,
      ...(body.customerType === 'CORE_ORGANIZATION'
        ? { organizationId: body.organizationId }
        : { userId: body.userId }),
    },
  })
}

export function ensureCoreCustomerRows(
  tenant: { id: string; defaultCurrency: string; defaultLanguage: string },
  existingId: string | null,
  body: CustomerEnsureBody,
  customerId: string,
  contactId: string,
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const identity =
      body.customerType === 'CORE_ORGANIZATION'
        ? { organizationId: body.organizationId ?? null, userId: null }
        : { organizationId: null, userId: body.userId ?? null }
    const snapshot = {
      ...(body.customerKind ? { customerKind: body.customerKind } : {}),
      ...(body.status ? { status: body.status } : {}),
      name: body.name,
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.companyName !== undefined
        ? { companyName: body.companyName }
        : {}),
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      coreSyncedAt: now,
      updatedAt: now,
    }
    const customer = existingId
      ? await tx.customer.update({ where: { id: existingId }, data: snapshot })
      : await tx.customer.create({
          data: {
            id: customerId,
            tenantId: tenant.id,
            customerType: body.customerType,
            customerKind:
              body.customerKind ??
              (body.customerType === 'CORE_ORGANIZATION'
                ? 'BUSINESS'
                : 'INDIVIDUAL'),
            ...identity,
            name: body.name,
            email: body.email ?? null,
            companyName: body.companyName ?? null,
            firstName: body.firstName ?? null,
            lastName: body.lastName ?? null,
            phone: body.phone ?? null,
            defaultCurrency: tenant.defaultCurrency,
            language: tenant.defaultLanguage,
            coreSyncedAt: now,
            status: body.status ?? 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          },
        })
    if (body.primaryContact !== undefined) {
      await tx.contact.deleteMany({
        where: {
          tenantId: tenant.id,
          customerId: customer.id,
          isPrimary: true,
        },
      })
      if (body.primaryContact)
        await tx.contact.create({
          data: {
            id: contactId,
            tenantId: tenant.id,
            customerId: customer.id,
            userId: body.primaryContact.userId ?? null,
            salutation: body.primaryContact.salutation ?? null,
            firstName: body.primaryContact.firstName ?? null,
            lastName: body.primaryContact.lastName ?? null,
            email: body.primaryContact.email ?? null,
            workPhone: body.primaryContact.workPhone ?? null,
            mobilePhone: body.primaryContact.mobilePhone ?? null,
            isPrimary: true,
            coreSyncedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        })
    }
    return customer
  })
}
