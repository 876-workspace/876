import { prisma } from '@/lib/db'

/** Lists tenant-owned customers for selectors and the customer roster. */
export function listCustomers(
  tenantId: string,
  status?: 'ACTIVE' | 'ARCHIVED'
) {
  return prisma.customer.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Lightweight billing-recipient snapshots used by document editors. */
export function listDocumentRecipients(tenantId: string) {
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
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
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
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
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

export type CustomerPageOptions = {
  limit: number
  startingAfter?: string
  endingBefore?: string
  userId?: string
  organizationId?: string
  status?: 'ACTIVE' | 'ARCHIVED'
}

/** Cursor-paginates customers in a deterministic newest-first order. */
export async function listCustomerPage(
  tenantId: string,
  options: CustomerPageOptions
) {
  const identityFilter = {
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.organizationId
      ? { organizationId: options.organizationId }
      : {}),
  }
  const statusFilter = options.status ? { status: options.status } : {}
  const cursorId = options.startingAfter ?? options.endingBefore
  const cursor = cursorId
    ? await prisma.customer.findFirst({
        where: {
          id: cursorId,
          tenantId,
          ...identityFilter,
          ...statusFilter,
        },
        select: { id: true, createdAt: true },
      })
    : null
  if (cursorId && !cursor) return null

  const isBackward = Boolean(options.endingBefore)
  const boundary = cursor
    ? isBackward
      ? {
          OR: [
            { createdAt: { gt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { gt: cursor.id } },
          ],
        }
      : {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
    : {}

  const [rows, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: {
        tenantId,
        ...identityFilter,
        ...statusFilter,
        ...boundary,
      },
      orderBy: isBackward
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    }),
    prisma.customer.count({
      where: { tenantId, ...identityFilter, ...statusFilter },
    }),
  ])
  const hasMore = rows.length > options.limit
  const page = rows.slice(0, options.limit)

  return {
    customers: isBackward ? page.reverse() : page,
    hasMore,
    totalCount,
  }
}

/**
 * Lifetime revenue received per customer (sum of recorded payments), keyed by
 * customer ID, in each currency's minor units. Customers with no payments are
 * absent from the map (treated as zero by callers).
 */
export async function receivablesByCustomer(
  tenantId: string
): Promise<Record<string, number>> {
  const grouped = await prisma.payment.groupBy({
    by: ['customerId'],
    where: { tenantId, status: 'SUCCEEDED' },
    _sum: { amount: true },
  })

  const totals: Record<string, number> = {}
  for (const row of grouped)
    totals[row.customerId] = Number(row._sum.amount ?? 0n)

  return totals
}
