import { prisma } from '@/db/client'

import type {
  BillingCustomerOutboxRow,
  BillingCustomerSyncRepository,
  MembershipRow,
  OrganizationRow,
  UserRow,
} from './billing-customer-sync'

export function createBillingCustomerSyncRepository(): BillingCustomerSyncRepository {
  return {
    async findUserById(userId) {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
        },
      })
      return (row as UserRow | null) ?? null
    },

    async listMembershipsByOrganizationId(organizationId) {
      const rows = await prisma.membership.findMany({
        where: { organizationId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      })
      return rows as MembershipRow[]
    },

    async findLatestOutboxBySubject(subjectType, subjectId) {
      const row = await prisma.billingCustomerOutbox.findFirst({
        where: { subjectType, subjectId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      return (row as BillingCustomerOutboxRow | null) ?? null
    },

    async createOutboxEvent(data) {
      const row = await prisma.billingCustomerOutbox.create({ data })
      return row as BillingCustomerOutboxRow
    },

    async updateOutboxEvent(eventId, data) {
      const row = await prisma.billingCustomerOutbox.update({
        where: { id: eventId },
        data,
      })
      return row as BillingCustomerOutboxRow
    },

    async listOrganizations() {
      const rows = await prisma.organization.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          doingBusinessAs: true,
          primaryEmail: true,
          primaryPhone: true,
          primaryContactUserId: true,
        },
      })
      return rows as OrganizationRow[]
    },

    async listKnownUserIds() {
      const rows = await prisma.billingCustomerOutbox.findMany({
        where: { subjectType: 'user' },
        distinct: ['subjectId'],
        select: { subjectId: true },
      })
      return rows.map((r) => r.subjectId)
    },
  }
}
