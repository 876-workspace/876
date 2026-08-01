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
        const existing = await transaction.courierCustomerProfile.findUnique({
          where: {
            courier_customer_profiles_tenant_user_key: {
              tenantId: params.tenantId,
              userId: params.userId,
            },
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
