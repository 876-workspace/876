import { Prisma } from '@/db/generated/prisma/client'
import { prisma } from './customers.repository'
import { AppHttpError } from '@/platform/errors'
import {
  nowUnixSeconds,
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'
import type {
  CreateCustomerBody,
  Customer,
  ListCustomersQuery,
  Mailbox,
  MailboxCreateBody,
  MailboxUpdateBody,
  UpdateCustomerBody,
} from './customers.schemas'

const missing = (resource: string) =>
  new AppHttpError({
    code: `${resource}/not-found`,
    message: 'Not found.',
    httpStatus: 404,
  })
const conflict = (resource: string, message: string) =>
  new AppHttpError({ code: `${resource}/conflict`, message, httpStatus: 409 })
export async function listCustomers(
  tenantId: string,
  query: ListCustomersQuery
) {
  const rows = await prisma.courierCustomerProfile.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.branch_id ? { branchId: query.branch_id } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
  })
  return {
    data: rows.slice(0, query.limit).map(serializeCustomer),
    hasMore: rows.length > query.limit,
  }
}
export async function retrieveCustomer(
  tenantId: string,
  id: string
): Promise<Customer> {
  const row = await prisma.courierCustomerProfile.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
  if (!row) throw missing('customer')
  return serializeCustomer(row)
}
export async function createCustomer(
  tenantId: string,
  input: CreateCustomerBody
): Promise<Customer> {
  if (!(await prisma.tenant.findUnique({ where: { id: tenantId } })))
    throw missing('tenant')
  const now = nowUnixSeconds()
  try {
    return serializeCustomer(
      await prisma.courierCustomerProfile.create({
        data: {
          tenantId,
          billingCustomerId: input.billing_customer_id,
          userId: input.user_id ?? null,
          branchId: input.branch_id ?? null,
          status: input.status ?? 'ACTIVE',
          isCommercial: input.is_commercial ?? false,
          firstSeenAt: now,
          createdAt: now,
          updatedAt: now,
        },
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict(
        'customer',
        'A courier profile already exists for this customer.'
      )
    throw error
  }
}
export async function updateCustomer(
  tenantId: string,
  id: string,
  input: UpdateCustomerBody
): Promise<Customer> {
  await retrieveCustomer(tenantId, id)
  return serializeCustomer(
    await prisma.courierCustomerProfile.update({
      where: { id },
      data: {
        ...(input.branch_id === undefined ? {} : { branchId: input.branch_id }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.is_commercial === undefined
          ? {}
          : { isCommercial: input.is_commercial }),
        updatedAt: nowUnixSeconds(),
      },
    })
  )
}
export async function listMailboxes(
  tenantId: string,
  customerId: string
): Promise<Mailbox[]> {
  await retrieveCustomer(tenantId, customerId)
  return (
    await prisma.mailbox.findMany({
      where: { tenantId, customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
  ).map(serializeMailbox)
}
export async function createMailbox(
  tenantId: string,
  customerId: string,
  input: MailboxCreateBody
): Promise<Mailbox> {
  await retrieveCustomer(tenantId, customerId)
  const now = nowUnixSeconds()
  try {
    return serializeMailbox(
      await prisma.$transaction(async (tx) => {
        const count = await tx.mailbox.count({
          where: { tenantId, customerId },
        })
        const isPrimary = count === 0 || input.is_primary === true
        if (isPrimary && count > 0)
          await tx.mailbox.updateMany({
            where: { tenantId, customerId, isPrimary: true },
            data: { isPrimary: false, updatedAt: now },
          })
        return tx.mailbox.create({
          data: {
            tenantId,
            customerId,
            number: input.number.toUpperCase(),
            isPrimary,
            createdAt: now,
            updatedAt: now,
          },
        })
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict('mailbox', 'That mailbox number is already in use.')
    throw error
  }
}
export async function updateMailbox(
  tenantId: string,
  customerId: string,
  id: string,
  input: MailboxUpdateBody
): Promise<Mailbox> {
  const current = await prisma.mailbox.findFirst({
    where: { id, tenantId, customerId },
  })
  if (!current) throw missing('mailbox')
  const now = nowUnixSeconds()
  return serializeMailbox(
    await prisma.$transaction(async (tx) => {
      if (input.is_primary && !current.isPrimary)
        await tx.mailbox.updateMany({
          where: { tenantId, customerId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })
      return tx.mailbox.update({
        where: { id },
        data: { isPrimary: input.is_primary, updatedAt: now },
      })
    })
  )
}
function serializeCustomer(row: any): Customer {
  return {
    object: 'courier_customer_profile',
    id: row.id,
    tenant_id: row.tenantId,
    user_id: row.userId,
    billing_customer_id: row.billingCustomerId,
    branch_id: row.branchId,
    status: row.status,
    is_commercial: row.isCommercial,
    first_seen_at: fromDbUnixSeconds(row.firstSeenAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
  }
}
function serializeMailbox(row: any): Mailbox {
  return {
    object: 'mailbox',
    id: row.id,
    tenant_id: row.tenantId,
    customer_id: row.customerId,
    number: row.number,
    is_primary: row.isPrimary,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
