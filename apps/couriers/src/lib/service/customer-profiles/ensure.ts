import { nowUnixSeconds } from '@876/core/timestamps'

import { reportServiceFailure } from '../report'
import { runTransaction } from '../transaction'

/**
 * Creates or reconnects the Courier-only profile for a shared Billing customer.
 * Operational fields are never overwritten during a reconnect.
 */
export async function ensure(params: {
  tenantId: string
  userId: string
  billingCustomerId: string
  mailboxNumber: string
}) {
  const now = nowUnixSeconds()
  try {
    return await runTransaction(
      'customerProfiles.ensure',
      async (transaction) => {
        // Deliberately unfiltered by deletedAt. A soft-deleted profile still
        // occupies the (tenantId, userId) unique key, so skipping it here would
        // send enrollment down the create path, hit that constraint, and lock
        // the person out of the portal permanently.
        const existing = await transaction.courierCustomerProfile.findFirst({
          where: {
            tenantId: params.tenantId,
            userId: params.userId,
          },
        })

        if (
          existing?.billingCustomerId &&
          existing.billingCustomerId !== params.billingCustomerId
        )
          throw new Error(
            'Courier customer profile is already linked to another Billing customer.'
          )

        if (existing)
          return transaction.courierCustomerProfile.update({
            where: { id: existing.id },
            data: {
              billingCustomerId: params.billingCustomerId,
              updatedAt: now,
              // Enrolling again revives the archived profile rather than
              // replacing it, so a returning customer keeps the mailbox number
              // their senders already have. That continuity is the reason the
              // delete is soft in the first place.
              ...(existing.deletedAt === null
                ? {}
                : {
                    deletedAt: null,
                    deletedBy: null,
                    deletionReason: null,
                  }),
            },
          })

        return transaction.courierCustomerProfile.create({
          data: {
            tenantId: params.tenantId,
            userId: params.userId,
            billingCustomerId: params.billingCustomerId,
            status: 'ACTIVE',
            firstSeenAt: now,
            createdAt: now,
            updatedAt: now,
            mailboxes: {
              create: {
                tenantId: params.tenantId,
                number: params.mailboxNumber,
                isPrimary: true,
                createdAt: now,
                updatedAt: now,
              },
            },
          },
        })
      }
    )
  } catch (error) {
    console.error('[service.customerProfiles.ensure]', error)
    reportServiceFailure(error, {
      operation: 'customerProfiles.ensure',
      consequence:
        'The customer profile was not saved and enrollment cannot continue.',
    })
    throw error
  }
}
